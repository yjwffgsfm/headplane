import log from "~/utils/log";

import type { HeadplaneConfig } from "../config-schema";
import dockerIntegration from "./docker";
import kubernetesIntegration from "./kubernetes";
import procIntegration from "./proc";

export async function loadIntegration(context: HeadplaneConfig["integration"]) {
  const integration = getIntegration(context);
  if (!integration) {
    return;
  }

  try {
    const res = await integration.isAvailable();
    if (!res) {
      log.error("config", "集成 %s 不可用", integration.name);
      return;
    }
  } catch (error) {
    log.error("config", "加载集成 %s 失败：%s", integration, error);
    log.debug("config", "加载错误：%o", error);
    return;
  }

  return integration;
}

function getIntegration(integration: HeadplaneConfig["integration"]) {
  const docker = integration?.docker;
  const k8s = integration?.kubernetes;
  const proc = integration?.proc;

  if (!docker?.enabled && !k8s?.enabled && !proc?.enabled) {
    log.debug("config", "未启用任何集成");
    return;
  }

  if (docker?.enabled && k8s?.enabled && proc?.enabled) {
    log.error("config", "启用了多个集成，请仅选择一个");
    return;
  }

  if (docker?.enabled) {
    log.info("config", "正在使用 Docker 集成");
    return new dockerIntegration(integration!.docker!);
  }

  if (k8s?.enabled) {
    log.info("config", "正在使用 Kubernetes 集成");
    return new kubernetesIntegration(integration!.kubernetes!);
  }

  if (proc?.enabled) {
    log.info("config", "正在使用进程集成");
    return new procIntegration(integration!.proc!);
  }
}