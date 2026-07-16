import { useFetcher } from "react-router";

import Button from "~/components/button";
import Link from "~/components/link";
import Notice from "~/components/notice";
import StatusCircle from "~/components/status-circle";
import Text from "~/components/text";
import Title from "~/components/title";
import { agentsContext, authContext } from "~/server/context";
import { formatTimeDelta } from "~/utils/time";

import type { Route } from "./+types/agent";

export async function loader({ request, context }: Route.LoaderArgs) {
  const agents = context.get(agentsContext);
  const auth = context.get(authContext);

  await auth.require(request);

  if (agents.state !== "enabled") {
    return { enabled: false as const, reason: agents.reason };
  }

  const sync = agents.value.lastSync();
  return {
    enabled: true as const,
    syncedAt: sync.syncedAt?.toISOString() ?? null,
    nodeCount: sync.nodeCount,
    error: sync.error,
    authUrl: sync.authUrl,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const agents = context.get(agentsContext);
  const auth = context.get(authContext);

  await auth.require(request);

  if (agents.state !== "enabled") {
    return { success: false, error: agents.reason };
  }

  await agents.value.triggerSync();
  const sync = agents.value.lastSync();
  return {
    success: !sync.error,
    error: sync.error,
    authUrl: sync.authUrl,
  };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<typeof action>();
  const isSyncing = fetcher.state !== "idle";

  if (!loaderData.enabled) {
    return (
      <div className="flex max-w-(--breakpoint-lg) flex-col gap-8">
        <Title>Headplane 代理</Title>
        <Notice title="代理未启用">
          {loaderData.reason}。要了解如何设置代理，请访问{" "}
          <Link external styled to="https://headplane.net/features/agent">
            文档
          </Link>
        </Notice>
      </div>
    );
  }

  const isPending = !loaderData.syncedAt && loaderData.authUrl;
  const hasError = Boolean(loaderData.error);

  return (
    <div className="flex max-w-(--breakpoint-lg) flex-col gap-8">
      <div className="flex w-full flex-col sm:w-2/3">
        <Title>Headplane 代理</Title>
        <Text>Headplane 代理会从您的 Tailnet 同步节点信息，如操作系统版本和连接详情。</Text>
      </div>

      <div className="flex items-center gap-3">
        <StatusCircle isOnline={!hasError && !isPending} className="h-5 w-5" />
        <span className="text-lg font-medium">
          {hasError ? "错误" : isPending ? "等待批准" : "健康"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Text>
          <span className="font-medium">最后同步：</span>
          {loaderData.syncedAt ? (
            <span suppressHydrationWarning>{formatTimeDelta(new Date(loaderData.syncedAt))}</span>
          ) : (
            "从未"
          )}
        </Text>
        <Text>
          <span className="font-medium">已同步节点：</span>
          {loaderData.nodeCount}
        </Text>
      </div>

      {isPending ? (
        <Notice variant="warning" title="代理需要批准">
          代理正在等待其 Tailnet 注册获得批准。Headplane 将尝试自动批准，但如果失败，您可以通过访问{" "}
          <Link external styled to={loaderData.authUrl!}>
            此链接
          </Link>
          来完成批准。
        </Notice>
      ) : undefined}

      {loaderData.error ? (
        <Notice variant="error" title="同步错误">
          {loaderData.error}
        </Notice>
      ) : undefined}

      <fetcher.Form method="post">
        <Button type="submit" variant="heavy" disabled={isSyncing}>
          {isSyncing ? "同步中…" : "立即同步"}
        </Button>
      </fetcher.Form>
    </div>
  );
}
