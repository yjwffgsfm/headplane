// MARK: Headplane 应用程序
//
// 加载配置，构建进程级应用上下文，并将 React Router 请求监听器作为默认导出导出。
//
// 此模块在两个地方被引用：
//   - `app/server/main.ts` — 生产环境启动脚本；为监听器包装静态资源服务，并绑定 http(s) 服务器。
//   - `runtime/vite-plugin.ts` — 开发模式 Vite 中间件；通过 `ssrLoadModule` 加载此模块，并分发每个请求。

import { exit, versions } from "node:process";

import { createRequestListener } from "@react-router/node";
import { RouterContextProvider } from "react-router";
import * as build from "virtual:react-router/server-build";

import log from "~/utils/log";

import type { HeadplaneConfig } from "./config/config-schema";
import { ConfigError } from "./config/error";
import { loadConfig } from "./config/load";
import {
  agentsContext,
  appConfigContext,
  authContext,
  createAppContext,
  dbContext,
  headscaleApiKeyContext,
  headscaleConfigContext,
  headscaleContext,
  headscaleLiveStoreContext,
  integrationContext,
  oidcContext,
  requestApiContext,
} from "./context";

log.info("server", "正在运行 Node.js %s", versions.node);

let config: HeadplaneConfig;
try {
  config = await loadConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    log.error("server", "无法加载配置：%s", error.message);
  } else {
    log.error("server", "加载配置失败：%s", error);
  }
  exit(1);
}

if ((config.server.tls_cert_path || config.server.tls_key_path) && !config.server.cookie_secure) {
  log.warn(
    "server",
    "已启用 TLS，但 `server.cookie_secure` 为 false；已强制设为 true（浏览器会拒绝通过 HTTPS 传输未设置 Secure 标志的 Cookie）",
  );
  config.server.cookie_secure = true;
}

const ctx = await createAppContext(config);
ctx.startServices();

export { config };

/**
 * 释放进程级上下文。由生产环境监管进程在收到 SIGTERM/SIGINT 信号时调用，
 * 以及由开发环境 Vite 插件在 HMR 重载时调用。
 */
export async function dispose(): Promise<void> {
  await ctx.dispose();
}

// TODO: `getLoadContext` 是处理反向代理转发的正确位置 —— 比在 OIDC 客户端中处理更好，
// 因为它适用于所有请求，而不仅仅是 OIDC 请求。
function getLoadContext(request: Request, client: ClientAddress) {
  ctx.auth.registerRequestClientAddress(request, client.address);

  const routerContext = new RouterContextProvider();
  routerContext.set(agentsContext, ctx.agents);
  routerContext.set(appConfigContext, ctx.config);
  routerContext.set(authContext, ctx.auth);
  routerContext.set(dbContext, ctx.db);
  routerContext.set(headscaleContext, ctx.headscale);
  routerContext.set(headscaleApiKeyContext, ctx.headscaleApiKey);
  routerContext.set(headscaleConfigContext, ctx.hs);
  routerContext.set(headscaleLiveStoreContext, ctx.hsLive);
  routerContext.set(integrationContext, ctx.integration);
  routerContext.set(oidcContext, ctx.oidc);
  routerContext.set(requestApiContext, ctx.apiForRequest);
  return routerContext;
}

interface ClientAddress {
  address?: string;
}

export default createRequestListener({
  build,
  mode: import.meta.env.MODE,
  getLoadContext,
});