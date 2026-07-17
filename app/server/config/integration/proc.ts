import { platform } from "node:os";

import { type } from "arktype";

import type { Headscale } from "~/server/headscale/api";
import log from "~/utils/log";

import { Integration } from "./abstract";
import { findHeadscaleServe, signalAndWaitHealthy } from "./proc-helper";

const configSchema = {
  full: type({
    enabled: "boolean",
  }),

  partial: type({
    enabled: "boolean?",
  }).partial(),
};

export default class ProcIntegration extends Integration<typeof configSchema.full.infer> {
  private pid: number | undefined;

  get name() {
    return "原生 Linux（/proc）";
  }

  static get configSchema() {
    return configSchema;
  }

  async isAvailable() {
    if (platform() !== "linux") {
      log.error("config", "/proc 仅支持 Linux 平台");
      return false;
    }

    try {
      const result = await findHeadscaleServe();
      if (!result) {
        log.error("config", "未找到 headscale serve 进程");
        return false;
      }

      this.pid = result;
      log.info("config", "找到 headscale serve（PID %d）", this.pid);
      return true;
    } catch (error) {
      log.error("config", "扫描 /proc 失败：%s", error);
      return false;
    }
  }

  async onConfigChange(headscale: Headscale) {
    if (!this.pid) {
      return;
    }

    await signalAndWaitHealthy(headscale, {
      pid: this.pid,
      signal: "SIGHUP",
    });
  }
}