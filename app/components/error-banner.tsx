import { AlertCircle } from "lucide-react";
import { isRouteErrorResponse } from "react-router";

import { isApiError, isConnectionError } from "~/server/headscale/api/error-client";
import cn from "~/utils/cn";

import Card from "./card";
import Code from "./code";
import Link from "./link";

export function getErrorMessage(error: Error | unknown): {
  title: string;
  jsxMessage: React.ReactNode;
} {
  if (isRouteErrorResponse(error)) {
    if (isApiError(error.data)) {
      const { statusCode, rawData, data, requestUrl } = error.data;
      if (statusCode >= 500) {
        return {
          jsxMessage: (
            <>
              <Card.Text>
                与 Headscale API 通信时出错。
                <br />
                服务器响应状态码为 <strong>{statusCode}</strong>，表示服务器端问题。请检查 Headscale
                服务器状态，稍后重试。
              </Card.Text>
              {(error.data.data != null || error.data.rawData != null) && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-mist-100 p-2 dark:bg-mist-800">
                  {error.data.data != null ? (
                    <code>{JSON.stringify(error.data.data, null, 2)}</code>
                  ) : (
                    <code>{error.data.rawData}</code>
                  )}
                </pre>
              )}
            </>
          ),
          title: "Headscale API 错误",
        };
      }

      const authError = error.data.statusCode === 401 || error.data.statusCode === 403;

      return {
        jsxMessage: (
          <>
            <Card.Text className="leading-snug">
              Headscale API 返回了意外响应。
              {authError ? (
                <> 状态码表示身份验证错误。请检查您的 API 密钥和 Headplane 配置。</>
              ) : (
                <> 您可能使用了不支持的 Headscale 版本，或者这可能是一个 Bug。</>
              )}
            </Card.Text>
            <ul className="mt-2 list-inside list-disc">
              <li>
                请求 URL：<Code>{requestUrl}</Code>
              </li>
              <li>
                状态码：{" "}
                <Code>
                  {/* @ts-expect-error */}
                  {data === null ? (
                    <>
                      {statusCode} {rawData}
                    </>
                  ) : (
                    <>
                      {statusCode} {error.statusText}
                    </>
                  )}
                </Code>
              </li>
            </ul>
            <Card.Text className="mt-4 text-lg font-semibold">错误详情</Card.Text>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-mist-100 p-2 dark:bg-mist-800">
              <code>{JSON.stringify(error.data, null, 2)}</code>
            </pre>
          </>
        ),
        title: "Headscale API 响应无效",
      };
    }

    if (isConnectionError(error.data)) {
      const { requestUrl, errorCode, errorMessage, extraData } = error.data;
      return {
        jsxMessage: (
          <>
            <Card.Text className="leading-snug">
              Headplane 无法连接到 Headscale API。请检查您的网络设置和配置，确保 Headplane
              能够连接。
            </Card.Text>
            <Card.Text className="mt-4 text-lg font-semibold">错误详情</Card.Text>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-mist-100 p-2 dark:bg-mist-800">
              {requestUrl}
              <br />
              {errorCode}: {errorMessage}
              {extraData != null && (
                <>
                  <br />
                  <br />
                  <code>{JSON.stringify(extraData, null, 2)}</code>
                </>
              )}
            </pre>
          </>
        ),
        title: "无法连接到 Headscale API",
      };
    }

    return {
      jsxMessage: (
        <>
          处理您的请求时出错。
          <br />
          状态码：<strong>{error.status}</strong>
          <br />
          状态文本：<strong>{error.data}</strong>
        </>
      ),
      title: `错误 ${error.status}`,
    };
  }

  if (!(error instanceof Error)) {
    return {
      jsxMessage: (
        <>
          <Card.Text>
            发生了意外错误，很可能是 Bug。请在{" "}
            <Link external styled to="https://github.com/tale/headplane/issues">
              Headplane GitHub
            </Link>{" "}
            仓库中提交 Issue，并附上以下详细信息。
          </Card.Text>
          <Card.Text className="mt-4 text-lg font-semibold">错误详情</Card.Text>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-mist-100 p-2 dark:bg-mist-800">
            <code>{JSON.stringify(error, null, 2)}</code>
          </pre>
        </>
      ),
      title: "意外错误",
    };
  }

  // Traverse the error chain to find the root cause
  let rootError = error;
  if (error.cause != null) {
    rootError = error.cause as Error;
    while (rootError.cause != null) {
      rootError = rootError.cause as Error;
    }
  }

  // TODO: If we are aggregate, concat into a single message
  if (rootError instanceof AggregateError) {
    throw new Error("AggregateError handling not implemented yet");
  }

  return {
    jsxMessage: rootError.message,
    title:
      rootError.name.length > 0 && rootError.name !== "Error" ? `错误：${rootError.name}` : "错误",
  };
}

interface ErrorBannerProps {
  error: unknown;
  className?: string;
}

export function ErrorBanner({ error, className }: ErrorBannerProps) {
  const { title, jsxMessage } = getErrorMessage(error);

  return (
    <Card className={cn("w-screen", className)} variant="flat">
      <div className="flex items-center justify-between gap-4">
        <Card.Title>{title}</Card.Title>
        <AlertCircle className="mb-2 h-6 w-6 text-red-500" />
      </div>
      {jsxMessage}
    </Card>
  );
}
