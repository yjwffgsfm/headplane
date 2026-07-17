import { readdir, readFile } from "node:fs/promises";
import { platform } from "node:os";
import { join } from "node:path";

import { CoreV1Api, KubeConfig } from "@kubernetes/client-node";
import { type } from "arktype";

import type { Headscale } from "~/server/headscale/api";
import log from "~/utils/log";

import { Integration } from "./abstract";
import { findHeadscaleServe, signalAndWaitHealthy } from "./proc-helper";

// https://github.com/kubernetes-client/javascript/blob/055b83c6504dfd1b2a2d081efd974163c6cbb808/src/config.ts#L40
const svcRoot = "/var/run/secrets/kubernetes.io/serviceaccount";
const svcCaPath = `${svcRoot}/ca.crt`;
const svcTokenPath = `${svcRoot}/token`;
const svcNamespacePath = `${svcRoot}/namespace`;

const configSchema = {
  full: type({
    enabled: "boolean",
    pod_name: "string",
    validate_manifest: "boolean = true",
  }),

  partial: type({
    enabled: "boolean?",
    pod_name: "string?",
    validate_manifest: "boolean?",
  }).partial(),
};

export default class KubernetesIntegration extends Integration<typeof configSchema.full.infer> {
  private pid: number | undefined;

  get name() {
    return "Kubernetes (k8s)";
  }

  static get configSchema() {
    return configSchema;
  }

  async isAvailable() {
    if (platform() !== "linux") {
      log.error("config", "Kubernetes 仅支持 Linux 平台");
      return false;
    }

    try {
      log.debug("config", "正在检查 Kubernetes 服务账号：%s", svcRoot);
      const files = await readdir(svcRoot);
      if (files.length === 0) {
        log.error("config", "未找到 Kubernetes 服务账号");
        return false;
      }

      const mappedFiles = new Set(files.map((file) => join(svcRoot, file)));
      const expectedFiles = [svcCaPath, svcTokenPath, svcNamespacePath];

      log.debug("config", "正在查找：%s", expectedFiles.join(", "));
      if (!expectedFiles.every((file) => mappedFiles.has(file))) {
        log.error("config", "Kubernetes 服务账号不完整");
        return false;
      }
    } catch (error) {
      log.error("config", "无法访问 %s：%s", svcRoot, error);
      return false;
    }

    log.debug("config", "正在读取 Kubernetes 服务账号：%s", svcRoot);
    const namespace = await readFile(svcNamespacePath, "utf8");

    // 嵌套较深，但这是必要的
    if (this.context.validate_manifest === false) {
      log.warn("config", "已跳过严格的 Pod 状态检查");
    } else {
      const pod = this.context.pod_name;
      if (!pod) {
        log.error("config", "缺少 POD_NAME 环境变量");
        return false;
      }

      if (pod.trim().length === 0) {
        log.error("config", "Pod 名称为空");
        return false;
      }

      log.debug("config", "正在检查命名空间 %s 中的 Kubernetes Pod %s", namespace, pod);

      try {
        log.debug("config", "正在尝试获取集群 KubeConfig");
        const kc = new KubeConfig();
        kc.loadFromCluster();

        const cluster = kc.getCurrentCluster();
        if (!cluster) {
          log.error("config", "kubeconfig 不完整");
          return false;
        }

        log.info("config", "服务账号已连接到 %s（%s）", cluster.name, cluster.server);

        const kCoreV1Api = kc.makeApiClient(CoreV1Api);

        log.info("config", "正在检查命名空间 %s 中的 Pod %s", namespace, pod);
        log.debug("config", "正在读取 Pod %s 的信息", pod);
        const body = await kCoreV1Api.readNamespacedPod({
          name: pod,
          namespace,
        });

        if (!body.spec) {
          log.error("config", "Pod %s/%s 的信息中缺少 spec 字段", pod, namespace);

          return false;
        }

        log.debug("config", "获取到 Pod 信息：%o", body.spec);
        const shared = body.spec.shareProcessNamespace;
        if (shared === undefined) {
          log.error("config", "Pod 未设置 spec.shareProcessNamespace");

          return false;
        }

        if (!shared) {
          log.error("config", "Pod 已设置 spec.shareProcessNamespace 但值为 false");

          return false;
        }

        log.info("config", "Pod %s 已启用共享进程命名空间", pod);
      } catch (error) {
        log.error("config", "读取 Pod 信息失败：%s", error);
        return false;
      }
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