import { isRouteErrorResponse } from "react-router";

import { isApiError, isConnectionError } from "~/server/headscale/api/error-client";

export interface ErrorInfo {
  kind: "connection" | "forbidden" | "not_found" | "headscale" | "unknown";
  title: string;
  description: string;
  details?: string;
}

const BUG = "这可能是程序缺陷。请附上下方的详细信息在 GitHub 上报告。";

export function describeError(error: unknown): ErrorInfo {
  if (isRouteErrorResponse(error)) {
    const { data, status, statusText } = error;
    if (isConnectionError(data)) {
      return {
        kind: "connection",
        title: "无法连接 Headscale",
        description: "请确认 Headscale 正在运行，且 Headplane 能够连接到它。",
        details: lines(data.requestUrl, data.errorMessage || data.errorCode),
      };
    }

    if (isApiError(data)) {
      const details = lines(
        `${data.statusCode} ${data.requestUrl}`,
        data.data != null ? json(data.data) : data.rawData,
      );

      if (data.statusCode >= 500) {
        return {
          kind: "headscale",
          title: "Headscale 返回了错误",
          description: `Headscale 返回了 ${data.statusCode}。请检查其日志，然后重试。`,
          details,
        };
      }

      if (data.statusCode === 401 || data.statusCode === 403) {
        return {
          kind: "headscale",
          title: "Headscale 拒绝了该请求",
          description: "请确认 Headplane 配置中的 API 密钥有效且未过期。",
          details,
        };
      }

      return {
        kind: "headscale",
        title: "Headscale 返回了意料之外的响应",
        description: "Headplane 可能不支持该版本的 Headscale，或者这是一个程序缺陷。",
        details,
      };
    }

    if (status === 404) {
      return {
        kind: "not_found",
        title: "未找到页面",
        description: "该地址没有对应的内容。",
      };
    }

    const message = messageOf(data);

    if (status === 403) {
      return {
        kind: "forbidden",
        title: "无权访问",
        description: message ?? "请联系管理员获取访问权限。",
      };
    }

    return {
      kind: "unknown",
      title: "出了点问题",
      description:
        message ?? `服务器返回了 ${[status, statusText].filter(Boolean).join(" ")}。`,
    };
  }

  if (error instanceof Error) {
    let root = error;
    while (root.cause instanceof Error) {
      root = root.cause;
    }

    const message =
      root instanceof AggregateError
        ? root.errors.map((e) => (e instanceof Error ? e.message : String(e))).join("\n")
        : root.message;

    return {
      kind: "unknown",
      title: "出了点问题",
      description: BUG,
      details: `${root.name}: ${message}`,
    };
  }

  return { kind: "unknown", title: "出了点问题", description: BUG, details: json(error) };
}

function messageOf(data: unknown) {
  if (typeof data === "string" && data.length > 0) {
    return data;
  }

  if (typeof data === "object" && data !== null && "message" in data) {
    return typeof data.message === "string" ? data.message : undefined;
  }
}

function lines(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join("\n\n");
}

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}
