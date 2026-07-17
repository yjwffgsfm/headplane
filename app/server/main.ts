// MARK: 生产环境启动脚本
//
// 生产环境 SSR 构建入口。从 `./app` 导入 React Router 请求监听器，
// 为其包装静态资源服务（来自 `build/client`）和基路径重定向，
// 然后绑定 http(s) 服务器。
//
// 此文件在开发模式下 *不会* 被加载 —— `react-router dev` 通过 Vite 启动，
// 而仅用于开发的 `runtime/vite-plugin.ts` 会将请求直接分发给 `./app` 的默认导出。

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { exit } from "node:process";
import { fileURLToPath } from "node:url";

import log from "~/utils/log";

import { type StartOptions, composeListener, startHttpServer } from "../../runtime/http";
import requestListener, { config, dispose } from "./app";

// `import.meta.url` 解析为 `build/server/index.js`；构建后的客户端
// 位于其旁边的 `build/client/` 目录。
const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), "../client");

let tls: StartOptions["tls"];
const { tls_cert_path: certPath, tls_key_path: keyPath } = config.server;
if (certPath || keyPath) {
  if (!certPath || !keyPath) {
    log.error(
      "server",
      "TLS 配置错误：必须同时提供 `server.tls_cert_path` 和 `server.tls_key_path`",
    );
    exit(1);
  }

  try {
    const [cert, key] = await Promise.all([readFile(certPath), readFile(keyPath)]);
    tls = { cert, key };
  } catch (err) {
    log.error("server", "读取 TLS 材料失败：%s", err);
    exit(1);
  }
}

// `HEADPLANE_LISTEN_FILE` 是 Docker 特定的约定：
// Dockerfile 将其设置为 `/tmp/headplane-listen`，以便打包的
// `hp_healthcheck` 二进制文件能够发现需要探测的 URL。
// 原生安装不会附带消费者，因此如果未设置该变量，则跳过写入。
const listenFilePath = process.env.HEADPLANE_LISTEN_FILE;
const listenFile = listenFilePath
  ? {
      path: listenFilePath,
      // 包含 `__PREFIX__` 的完整 URL，以便 Go 二进制文件可以直接 GET
      // —— 无需路径拼接，也无需了解基路径。
      url: `${tls ? "https" : "http"}://127.0.0.1:${config.server.port}${__PREFIX__}/healthz`,
    }
  : undefined;

const runtimeLogger = {
  info: (message: string, ...args: unknown[]) => log.info("server", message, ...args),
  error: (message: string, ...args: unknown[]) => log.error("server", message, ...args),
};

startHttpServer({
  host: config.server.host,
  port: config.server.port,
  tls,
  logger: runtimeLogger,
  listenFile,
  listener: composeListener({
    basename: __PREFIX__,
    staticRoot: clientDir,
    immutableAssets: true,
    logger: runtimeLogger,
    requestListener,
  }),
  onShutdown: dispose,
});