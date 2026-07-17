import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { kill } from "node:process";
import { setTimeout } from "node:timers/promises";

import type { Headscale } from "~/server/headscale/api";
import log from "~/utils/log";

/**
 * 对 /proc 进行两阶段扫描，以查找正在运行 "serve" 子命令的 headscale 进程。
 * 首先扫描所有进程的 comm 文件以查找 headscale 进程，
 * 然后检查其 cmdline 文件以确认 "serve" 是否为第二个参数。
 *
 * @param procPath proc 文件系统路径（默认：/proc）
 * @returns headscale serve 进程的 PID，若未找到则返回 undefined
 */
export async function findHeadscaleServe(procPath = "/proc"): Promise<number | undefined> {
  const subdirs = await readdir(procPath);
  const commResults = await Promise.allSettled(
    subdirs.map(async (entry) => {
      const pid = Number.parseInt(entry, 10);
      if (Number.isNaN(pid)) {
        return undefined;
      }

      try {
        const comm = await readFile(join(procPath, entry, "comm"), "utf8");
        return comm.trim() === "headscale" ? pid : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  const headscalePids = commResults
    .map((result) => {
      if (result.status === "fulfilled" && result.value !== undefined) {
        return result.value;
      }
      return undefined;
    })
    .filter((pid): pid is number => pid !== undefined);

  if (headscalePids.length === 0) {
    return undefined;
  }

  log.debug("config", "找到 %d 个 headscale 进程，正在检查 serve", headscalePids.length);
  for (const pid of headscalePids) {
    try {
      const cmdline = await readFile(join(procPath, pid.toString(), "cmdline"), "utf8");
      const args = cmdline.split("\0").filter(Boolean);

      if (args[1] === "serve") {
        return pid;
      }
    } catch {
      // 进程可能在两次扫描之间退出了
    }
  }

  return undefined;
}

/**
 * 向 headscale 进程发送信号的选项。
 */
export interface SignalHeadscaleOptions {
  pid: number;
  signal?: NodeJS.Signals;
  maxAttempts?: number;
  retryDelayMs?: number;
}

/**
 * 向 headscale 进程发送信号，并等待其恢复健康状态。
 * @param headscale Headscale 实例，用于健康检查
 * @param options 信号发送和等待选项
 * @returns 如果 headscale 恢复健康则返回 true，否则返回 false
 */
export async function signalAndWaitHealthy(
  headscale: Headscale,
  options: SignalHeadscaleOptions,
): Promise<boolean> {
  const { pid, signal = "SIGHUP", maxAttempts = 10, retryDelayMs = 1000 } = options;

  try {
    kill(pid, signal);
    log.info("config", "已向 Headscale（PID %d）发送 %s 信号", pid, signal);
  } catch (error) {
    log.error("config", "向 PID %d 发送 %s 信号失败：%s", pid, signal, error);
    return false;
  }

  await setTimeout(retryDelayMs);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const healthy = await headscale.health();
      if (healthy) {
        log.info("config", "重启后 Headscale 已恢复正常");
        return true;
      }
    } catch {
      // 仍在重启中
    }

    if (attempt < maxAttempts) {
      await setTimeout(retryDelayMs);
    }
  }

  log.error("config", "Headscale 在 %d 次尝试后仍未恢复健康", maxAttempts);
  return false;
}