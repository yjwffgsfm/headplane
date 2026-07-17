import { type ChildProcess, spawn } from "node:child_process";
import { access, constants, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { inArray, notInArray } from "drizzle-orm";
import { NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";

import { HostInfo } from "~/types";
import log from "~/utils/log";

import { HeadplaneConfig } from "./config/config-schema";
import { hostInfo } from "./db/schema";
import type { HeadscaleClient } from "./headscale/api";

export interface AgentManager {
  lookup(nodeKeys: string[]): Promise<Record<string, HostInfo>>;
  lastSync(): {
    syncedAt: Date | null;
    nodeCount: number;
    error?: string;
    authUrl?: string;
  };
  agentNodeKey(): string | undefined;
  triggerSync(): Promise<void>;
  dispose(): void;
}

interface AgentOutput {
  self: string;
  hosts: Record<string, HostInfo>;
  error?: string;
}

interface SyncState {
  syncedAt: Date | null;
  nodeCount: number;
  selfKey?: string;
  error?: string;
  authUrl?: string;
}

async function hasExistingState(workDir: string): Promise<boolean> {
  try {
    await stat(join(workDir, "tailscaled.state"));
    return true;
  } catch {
    return false;
  }
}

export async function createAgentManager(
  agentConfig: NonNullable<NonNullable<HeadplaneConfig["integration"]>["agent"]> | undefined,
  headscaleUrl: string,
  apiClient: HeadscaleClient,
  supportsTagOnlyKeys: boolean,
  db: NodeSQLiteDatabase,
): Promise<AgentManager | undefined> {
  if (!agentConfig?.enabled) {
    return;
  }

  if (!supportsTagOnlyKeys) {
    log.error("agent", "Headplane Agent 需要 Headscale 0.28 或更高版本");
    log.error("agent", "在不支持仅标签密钥的情况下，Agent 将无法运行");
    return;
  }

  try {
    await access(agentConfig.executable_path, constants.X_OK);
  } catch {
    log.error("agent", "无法访问 Agent 可执行文件：%s", agentConfig.executable_path);
    return;
  }

  try {
    await access(agentConfig.work_dir, constants.R_OK | constants.W_OK);
  } catch {
    try {
      await mkdir(agentConfig.work_dir, { recursive: true });
      log.info("agent", "已创建 Agent 工作目录：%s", agentConfig.work_dir);
    } catch (innerError) {
      log.error(
        "agent",
        "无法创建 Agent 工作目录 %s：%s",
        agentConfig.work_dir,
        innerError instanceof Error ? innerError.message : String(innerError),
      );
      return;
    }
  }

  const hostName = agentConfig.host_name ?? "headplane-agent";
  const cacheTtl = agentConfig.cache_ttl ?? 180_000;
  const executablePath = agentConfig.executable_path;
  const workDir = agentConfig.work_dir;

  const state: SyncState = {
    syncedAt: null,
    nodeCount: 0,
  };

  let proc: ChildProcess | null = null;
  let responseHandler: ((line: string) => void) | null = null;
  let disposed = false;
  let consecutiveErrors = 0;
  let approvingAuthId: string | undefined;

  async function generateAuthKey(): Promise<string> {
    const expiration = new Date(Date.now() + 5 * 60_000);
    const pak = await apiClient.preAuthKeys.create({
      user: null,
      ephemeral: false,
      reusable: false,
      expiration,
      aclTags: [`tag:${hostName}`],
    });
    return pak.key;
  }

  function spawnAgent(authKey: string): ChildProcess {
    const env: Record<string, string> = {
      HOME: process.env.HOME ?? "",
      HEADPLANE_AGENT_WORK_DIR: workDir,
      HEADPLANE_AGENT_TS_SERVER: headscaleUrl,
      HEADPLANE_AGENT_HOSTNAME: hostName,
      HEADPLANE_AGENT_DEBUG: log.debugEnabled ? "true" : "false",
    };

    if (authKey) {
      env.HEADPLANE_AGENT_TS_AUTHKEY = authKey;
      log.info("agent", "正在使用预授权密钥启动 Agent（前缀：%s）", authKey.slice(0, 16));
    } else {
      log.info("agent", "正在启动 Agent（不使用预授权密钥，将复用现有状态）");
    }

    const child = spawn(executablePath, [], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (!text) {
        return;
      }

      log.debug("agent", "%s", text);

      // tsnet 在回退到交互式登录时会输出认证 URL。
      // 捕获该 URL 以便 UI 在需要时展示批准链接，并尝试使用
      // Headplane 的管理 API 自动批准 Agent。
      const authMatch = text.match(
        /To start this tsnet server, restart with TS_AUTHKEY set, or go to: (https:\/\/\S+)/,
      );
      if (authMatch) {
        state.authUrl = authMatch[1];
        log.warn("agent", "Agent 正在等待交互式批准；请访问：%s", state.authUrl);

        const authId = state.authUrl.split("/").pop();
        if (authId && authId !== approvingAuthId) {
          approvingAuthId = authId;
          log.info("agent", "正在尝试自动批准认证请求 %s", authId);
          apiClient.auth
            .approve(authId)
            .then(() => {
              log.info("agent", "已自动批准认证请求 %s", authId);
            })
            .catch((error) => {
              log.warn(
                "agent",
                "自动批准认证请求 %s 失败：%s",
                authId,
                error instanceof Error ? error.message : String(error),
              );
            });
        }
      }
    });

    const rl = createInterface({ input: child.stdout! });
    rl.on("line", (line) => {
      if (responseHandler) {
        const handler = responseHandler;
        responseHandler = null;
        handler(line);
      }
    });

    child.on("exit", (code, signal) => {
      if (!disposed) {
        log.warn("agent", "Agent 进程已退出（code=%s, signal=%s）", code, signal);
      } else {
        log.info(
          "agent",
          "Agent 进程在释放期间退出（code=%s, signal=%s）",
          code,
          signal,
        );
      }
      proc = null;

      // 拒绝任何待处理的同步请求
      if (responseHandler) {
        const handler = responseHandler;
        responseHandler = null;
        handler("");
      }
    });

    proc = child;
    return child;
  }

  async function ensureProcess(): Promise<ChildProcess> {
    if (proc && proc.exitCode === null) {
      return proc;
    }

    const stateExists = await hasExistingState(workDir);
    const authKey = await generateAuthKey();
    if (stateExists) {
      log.debug("agent", "正在复用现有的 tsnet 身份");
      log.info(
        "agent",
        "检测到现有状态；Agent 将复用该状态，并在需要时回退使用预授权密钥",
      );
    } else {
      log.info("agent", "未检测到 tsnet 状态，Agent 将使用预授权密钥进行注册");
    }

    return spawnAgent(authKey);
  }

  function sendSync(child: ChildProcess): Promise<string> {
    return new Promise((resolve) => {
      responseHandler = resolve;
      child.stdin?.write("sync\n");
    });
  }

  async function requestSync(child: ChildProcess): Promise<AgentOutput> {
    const line = await sendSync(child);
    if (!line) {
      throw new Error("Agent 进程意外关闭");
    }
    return JSON.parse(line) as AgentOutput;
  }

  let isSyncing = false;
  let pendingResync = false;

  async function sync() {
    if (isSyncing) {
      pendingResync = true;
      log.debug("agent", "同步进行中，已排队等待重新同步");
      return;
    }

    isSyncing = true;
    try {
      const child = await ensureProcess();
      const output = await requestSync(child);

      if (output.error) {
        consecutiveErrors++;
        state.error = output.error;
        log.error("agent", "Agent 同步出错（%d/5）：%s", consecutiveErrors, output.error);

        if (consecutiveErrors >= 5 && proc) {
          log.warn("agent", "连续错误次数过多，正在终止 Agent 进程以重试");
          proc.kill("SIGTERM");
          proc = null;
        }
        return;
      }

      consecutiveErrors = 0;
      const keys = Object.keys(output.hosts);

      for (const [nodeKey, payload] of Object.entries(output.hosts)) {
        await db
          .insert(hostInfo)
          .values({
            host_id: nodeKey,
            payload,
            updated_at: new Date(),
          })
          .onConflictDoUpdate({
            target: hostInfo.host_id,
            set: {
              payload,
              updated_at: new Date(),
            },
          });
      }

      await pruneStaleHostInfo();
      await pruneEphemeralNodes();

      state.syncedAt = new Date();
      state.nodeCount = keys.length;
      state.selfKey = output.self || undefined;
      state.error = undefined;

      log.info("agent", "同步完成：已更新 %d 个节点", keys.length);
    } catch (error) {
      consecutiveErrors++;
      const message = error instanceof Error ? error.message : String(error);
      state.error = message;
      log.error("agent", "同步失败（%d/5）：%s", consecutiveErrors, message);

      if (consecutiveErrors >= 5) {
        log.warn(
          "agent",
          "连续失败次数过多；将保留 Agent 状态以避免创建新主机",
        );
      }
    } finally {
      isSyncing = false;
      if (pendingResync) {
        pendingResync = false;
        sync();
      }
    }
  }

  /**
   * 清理被标记为临时节点的离线节点。这是由于 Headscale 的一个缺陷：
   * 临时节点在断开连接后不会自动被移除。
   */
  async function pruneStaleHostInfo() {
    try {
      const nodes = await apiClient.nodes.list();
      const activeKeys = nodes.map((n) => n.nodeKey);

      if (activeKeys.length === 0) {
        return;
      }

      const deleted = await db
        .delete(hostInfo)
        .where(notInArray(hostInfo.host_id, activeKeys))
        .returning();

      if (deleted.length > 0) {
        log.info("agent", "已清理 %d 条过期的 hostinfo 记录", deleted.length);
      }
    } catch (error) {
      log.debug(
        "agent",
        "清理过期 hostinfo 失败：%s",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async function pruneEphemeralNodes() {
    try {
      const nodes = await apiClient.nodes.list();
      const toPrune = nodes.filter((n) => n.preAuthKey?.ephemeral && !n.online);

      for (const node of toPrune) {
        await apiClient.nodes.delete(node.id);
        log.info("agent", "已清理离线临时节点 %s", node.givenName);
      }
    } catch (error) {
      log.debug(
        "agent",
        "清理临时节点失败：%s",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  sync();

  const interval = setInterval(() => {
    sync();
  }, cacheTtl);

  return {
    async lookup(nodeKeys) {
      if (nodeKeys.length === 0) {
        return {};
      }

      const results = await db.select().from(hostInfo).where(inArray(hostInfo.host_id, nodeKeys));

      return Object.fromEntries(
        results.filter((r) => r.payload).map((r) => [r.host_id, r.payload]),
      ) as Record<string, HostInfo>;
    },

    lastSync() {
      return {
        syncedAt: state.syncedAt,
        nodeCount: state.nodeCount,
        error: state.error,
        authUrl: state.authUrl,
      };
    },

    agentNodeKey() {
      return state.selfKey;
    },

    async triggerSync() {
      await sync();
    },

    dispose() {
      disposed = true;
      clearInterval(interval);
      if (proc) {
        proc.kill("SIGTERM");
        proc = null;
      }
    },
  };
}