import { access, constants } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

import { type } from "arktype";
import { Client } from "undici";

import type { Headscale } from "~/server/headscale/api";
import log from "~/utils/log";

import { Integration } from "./abstract";

interface DockerContainer {
  Id: string;
  Names: string[];
}

interface DockerVersionInfo {
  ApiVersion?: string;
}

const REQUIRED_DOCKER_API_VERSION = "1.44";

function compareApiVersions(current: string, required: string) {
  const currentParts = current.split(".").map(Number);
  const requiredParts = required.split(".").map(Number);

  if (
    currentParts.some((part) => Number.isNaN(part)) ||
    requiredParts.some((part) => Number.isNaN(part))
  ) {
    throw new Error("无效的 Docker API 版本格式");
  }

  const length = Math.max(currentParts.length, requiredParts.length);

  for (let index = 0; index < length; index++) {
    const currentPart = currentParts[index] ?? 0;
    const requiredPart = requiredParts[index] ?? 0;

    if (currentPart > requiredPart) {
      return 1;
    }

    if (currentPart < requiredPart) {
      return -1;
    }
  }

  return 0;
}

function isSupportedDockerApiVersion(apiVersion: string) {
  return compareApiVersions(apiVersion, REQUIRED_DOCKER_API_VERSION) >= 0;
}

const configSchema = {
  full: type({
    enabled: "boolean",
    container_name: "string?",
    container_label: 'string = "me.tale.headplane.target=headscale"',
    socket: 'string = "unix:///var/run/docker.sock"',
  }),

  partial: type({
    enabled: "boolean?",
    container_name: "string?",
    container_label: "string?",
    socket: "string?",
  }).partial(),
};

export default class DockerIntegration extends Integration<typeof configSchema.full.infer> {
  private maxAttempts = 10;
  private client: Client | undefined;
  private containerId: string | undefined;

  get name() {
    return "Docker";
  }

  static get configSchema() {
    return configSchema;
  }

  async getContainerName(label: string, value: string): Promise<string> {
    if (!this.client) {
      throw new Error("Docker 客户端尚未初始化");
    }

    const filters = encodeURIComponent(
      JSON.stringify({
        label: [`${label}=${value}`],
      }),
    );
    const { body } = await this.client.request({
      method: "GET",
      path: `/containers/json?filters=${filters}`,
    });
    const containers: DockerContainer[] = (await body.json()) as DockerContainer[];
    if (containers.length > 1) {
      throw new Error(
        `找到多个匹配标签 ${label}=${value} 的 Docker 容器。请指定容器名称。`,
      );
    }
    if (containers.length === 0) {
      throw new Error(`未找到匹配标签的 Docker 容器：${label}=${value}`);
    }
    log.info("config", "找到匹配标签的 Docker 容器：%s=%s", label, value);
    return containers[0].Id;
  }

  async isAvailable() {
    log.info("config", "需要 Docker API 版本 %s 或更高", REQUIRED_DOCKER_API_VERSION);

    // 基础配置检查，由于历史兼容性原因，容器名称覆盖容器标签选择器。
    const { container_name, container_label } = this.context;
    if (container_name?.length === 0 && container_label.length === 0) {
      log.error("config", "缺少 Docker `container_name` 或 `container_label` 配置");
      return false;
    }

    // 验证 Docker 套接字是否可访问
    let url: URL | undefined;
    try {
      url = new URL(this.context.socket);
    } catch {
      log.error("config", "无效的 Docker 套接字路径：%s", this.context.socket);
      return false;
    }

    if (url.protocol !== "tcp:" && url.protocol !== "unix:") {
      log.error("config", "无效的 Docker 套接字协议：%s", url.protocol);
      return false;
    }

    // API 作为 HTTP 端点可用，这将简化 undici 中的获取逻辑
    if (url.protocol === "tcp:") {
      // 似乎设置 url.protocol 不再起作用？
      const fetchU = url.href.replace(url.protocol, "http:");

      try {
        log.info("config", "正在检查 API：%s", fetchU);
        await fetch(new URL("/version", fetchU).href);
      } catch (error) {
        log.error("config", "连接 Docker API 失败：%s", error);
        log.debug("config", "连接错误：%o", error);
        return false;
      }

      this.client = new Client(fetchU);
    }

    // 检查套接字是否可访问
    if (url.protocol === "unix:") {
      try {
        log.info("config", "正在检查套接字：%s", url.pathname);
        await access(url.pathname, constants.R_OK);
      } catch (error) {
        log.error("config", "无法访问 Docker 套接字：%s", url.pathname);
        log.debug("config", "访问错误：%o", error);
        return false;
      }

      this.client = new Client("http://localhost", {
        socketPath: url.pathname,
      });
    }

    if (this.client === undefined) {
      log.error("config", "创建 Docker 客户端失败");
      return false;
    }

    try {
      const versionRes = await this.client.request({
        method: "GET",
        path: "/version",
      });

      if (versionRes.statusCode !== 200) {
        log.error("config", "无法请求 Docker API 版本");
        log.debug("config", "错误详情：%o", await versionRes.body.json());
        return false;
      }

      const versionInfo = (await versionRes.body.json()) as DockerVersionInfo;
      if (!versionInfo.ApiVersion) {
        log.error("config", "Docker API 版本响应缺少 `ApiVersion` 字段");
        return false;
      }

      log.info("config", "检测到 Docker API 版本 %s", versionInfo.ApiVersion);

      if (!isSupportedDockerApiVersion(versionInfo.ApiVersion)) {
        log.error(
          "config",
          "Docker API 版本 %s 过旧，需要 %s 或更高版本",
          versionInfo.ApiVersion,
          REQUIRED_DOCKER_API_VERSION,
        );
        return false;
      }
    } catch (error) {
      log.error("config", "验证 Docker API 版本失败：%s", error);
      log.debug("config", "版本检查错误：%o", error);
      return false;
    }

    const qp = new URLSearchParams({
      filters: JSON.stringify(
        container_name != null && container_name.length > 0
          ? { name: [container_name] }
          : { label: [container_label] },
      ),
    });

    log.debug("config", "正在使用过滤器请求 Docker 容器：%s", qp.toString());
    const res = await this.client.request({
      method: "GET",
      path: `/v${REQUIRED_DOCKER_API_VERSION}/containers/json?${qp.toString()}`,
    });

    if (res.statusCode !== 200) {
      log.error("config", "无法请求可用的 Docker 容器");
      log.debug("config", "错误详情：%o", await res.body.json());
      return false;
    }

    const data = (await res.body.json()) as DockerContainer[];
    if (data.length > 1) {
      if (container_name != null && container_name.length > 0) {
        log.error("config", `找到多个名称为 ${container_name} 的容器`);
      } else {
        log.error("config", `找到多个匹配标签 ${container_label} 的容器`);
      }

      return false;
    }

    if (data.length === 0) {
      if (container_name != null && container_name.length > 0) {
        log.error("config", `未找到名称为 ${container_name} 的容器`);
      } else {
        log.error("config", `未找到匹配标签 ${container_label} 的容器`);
      }

      return false;
    }

    this.containerId = data[0].Id;
    log.info("config", "正在使用容器：%s（ID：%s）", data[0].Names[0], this.containerId);

    return this.client !== undefined && this.containerId !== undefined;
  }

  async onConfigChange(headscale: Headscale) {
    if (!this.client) {
      return;
    }

    log.info("config", "正在通过 Docker 重启 Headscale");

    let attempts = 0;
    while (attempts <= this.maxAttempts) {
      log.debug("config", "正在重启容器：%s（尝试 %d）", this.containerId, attempts);

      const response = await this.client.request({
        method: "POST",
        path: `/v${REQUIRED_DOCKER_API_VERSION}/containers/${this.containerId}/restart`,
      });

      if (response.statusCode !== 204) {
        if (attempts < this.maxAttempts) {
          attempts++;
          await setTimeout(1000);
          continue;
        }

        const stringCode = response.statusCode.toString();
        const body = await response.body.text();
        throw new Error(`API 请求失败：${stringCode} ${body}`);
      }

      break;
    }

    attempts = 0;
    while (attempts <= this.maxAttempts) {
      try {
        log.debug("config", "正在检查 Headscale 状态（尝试 %d）", attempts);
        const status = await headscale.health();
        if (status === false) {
          throw new Error("Headscale 未运行");
        }

        log.info("config", "Headscale 已正常运行");
        return;
      } catch {
        if (attempts < this.maxAttempts) {
          attempts++;
          await setTimeout(1000);
          continue;
        }

        log.error("config", "等待 %s 重启超时", this.containerId);
        return;
      }
    }
  }
}