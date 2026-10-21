import { useFetcher } from "react-router";

import Button from "~/components/button";
import Callout from "~/components/callout";
import Link from "~/components/link";
import PageError from "~/components/page-error";
import PageHeader from "~/components/page-header";
import Section, { Row, RowList, SettingList, SettingRow } from "~/components/section";
import StatusCircle from "~/components/status-circle";
import {
  agentsContext,
  authContext,
  headscaleContext,
  headscaleLiveStoreContext,
  requestApiContext,
} from "~/server/context";
import { nodesResource } from "~/server/headscale/live-store";
import { Capabilities } from "~/server/web/roles";
import { getTSVersion } from "~/utils/host-info";
import { formatTimeDelta } from "~/utils/time";

import type { Route } from "./+types/agent";

export async function loader({ request, context }: Route.LoaderArgs) {
  const agents = context.get(agentsContext);
  const auth = context.get(authContext);
  const getRequestApi = context.get(requestApiContext);
  const headscale = context.get(headscaleContext);
  const headscaleLiveStore = context.get(headscaleLiveStoreContext);

  await auth.requireCapability(request, Capabilities.read_machines);

  if (agents.state !== "enabled") {
    return { enabled: false as const, reason: agents.reason };
  }

  // The sync status matters most when Headscale is down, so the page still
  // loads without the machine list.
  const { api } = await getRequestApi(request);
  const [isHealthy, fetched] = await Promise.all([
    headscale.health(),
    headscaleLiveStore
      .get(nodesResource, api)
      .then((snap) => snap.data)
      .catch(() => undefined),
  ]);
  const nodes = fetched ?? [];
  const sync = agents.value.lastSync();
  const selfKey = agents.value.agentNodeKey();
  const self = nodes.find((node) => node.nodeKey === selfKey);
  const others = nodes.filter((node) => node.nodeKey !== selfKey);

  const [selfInfo, updatedAt] = await Promise.all([
    agents.value.lookup(selfKey ? [selfKey] : []),
    agents.value.lastUpdated(others.map((node) => node.nodeKey)),
  ]);

  const synced = new Set(sync.syncedKeys);
  const missing = others
    .filter((node) => !synced.has(node.nodeKey))
    .map((node) => ({
      id: node.id,
      name: node.givenName,
      isOnline: node.online,
      updatedAt: updatedAt[node.nodeKey]?.toISOString() ?? null,
    }));

  return {
    enabled: true as const,
    // The layout already shows a banner when Headscale is down.
    isHeadscaleDown: !isHealthy,
    hasMachines: fetched !== undefined,
    syncedAt: sync.syncedAt?.toISOString() ?? null,
    startedAt: sync.startedAt?.toISOString() ?? null,
    intervalMs: sync.intervalMs,
    consecutiveErrors: sync.consecutiveErrors,
    error: sync.error,
    authUrl: sync.authUrl,
    self: self
      ? {
          id: self.id,
          name: self.givenName,
          isOnline: self.online,
          addresses: self.ipAddresses,
          version: selfKey && selfInfo[selfKey] ? getTSVersion(selfInfo[selfKey]) : undefined,
        }
      : undefined,
    machineCount: others.length,
    missing,
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
  const description = (
    <>
      从你的 Tailnet 网络同步每台设备的 Tailscale 版本、操作系统和连接状态。{" "}
      <Link external styled to="https://headplane.net/features/agent">
        文档
      </Link>
    </>
  );

  if (!loaderData.enabled) {
    return (
      <>
        <PageHeader description={description} isSubpage title="Agent" />
        <Callout title="Agent 已关闭">{loaderData.reason}。</Callout>
      </>
    );
  }

  const { self, missing, machineCount, isHeadscaleDown, hasMachines } = loaderData;
  const unavailable = <p className="text-muted py-2.5 text-sm">不可用</p>;
  const isPending = !loaderData.syncedAt && Boolean(loaderData.authUrl);
  const hasError = Boolean(loaderData.error);
  const intervalMinutes = Math.max(1, Math.round(loaderData.intervalMs / 60_000));

  return (
    <>
      <PageHeader
        actions={
          <fetcher.Form method="post">
            <Button pending={fetcher.state !== "idle"} type="submit">
              立即同步
            </Button>
          </fetcher.Form>
        }
        description={description}
        isSubpage
        title="Agent"
      />
      {isPending && loaderData.authUrl && (
        <Callout className="mb-6" title="等待批准" variant="warning">
          Headplane 会尝试自动批准 Agent 的 Tailnet 网络注册。如果未能成功，请{" "}
          <Link external styled to={loaderData.authUrl}>
            在此批准
          </Link>
          。
        </Callout>
      )}
      {loaderData.error && !isHeadscaleDown && (
        <Callout className="mb-6" title="同步失败" variant="error">
          {loaderData.error}
        </Callout>
      )}
      <Section title="同步">
        <SettingList>
          <SettingRow label="状态">
            <span className="flex items-center gap-2">
              <StatusCircle isExpired={hasError} isOnline={!hasError && !isPending} />
              {hasError
                ? `连续失败 ${loaderData.consecutiveErrors} 次`
                : isPending
                  ? "等待批准"
                  : "运行正常"}
            </span>
          </SettingRow>
          <SettingRow label="上次同步">
            {loaderData.syncedAt ? (
              <span suppressHydrationWarning title={new Date(loaderData.syncedAt).toLocaleString()}>
                {formatTimeDelta(new Date(loaderData.syncedAt))}
              </span>
            ) : (
              <span className="text-muted">从不</span>
            )}
            <span className="text-muted">
              {" "}
              · 每隔 {intervalMinutes} 分钟
            </span>
          </SettingRow>
          <SettingRow label="进程">
            {loaderData.startedAt ? (
              <span
                suppressHydrationWarning
                title={new Date(loaderData.startedAt).toLocaleString()}
              >
                启动于 {formatTimeDelta(new Date(loaderData.startedAt))}
              </span>
            ) : (
              <span className="text-muted">未运行</span>
            )}
          </SettingRow>
        </SettingList>
      </Section>
      <Section
        description="Agent 用来访问 Tailnet 网络中其他部分的节点。"
        title="Agent 设备"
      >
        {!hasMachines ? (
          unavailable
        ) : self ? (
          <SettingList>
            <SettingRow label="设备">
              <span className="flex items-center gap-2">
                <StatusCircle isOnline={self.isOnline} />
                <Link styled to={`/machines/${self.id}`}>
                  {self.name}
                </Link>
              </span>
            </SettingRow>
            <SettingRow label="地址">
              <span className="font-mono text-xs">{self.addresses[0] ?? "无"}</span>
            </SettingRow>
            <SettingRow label="Tailscale 版本">
              <span className="font-mono text-xs">{self.version ?? "未知"}</span>
            </SettingRow>
          </SettingList>
        ) : (
          <p className="text-muted py-2.5 text-sm">Agent 尚未加入 Tailnet 网络。</p>
        )}
      </Section>
      <Section
        description="未出现在上次同步中的设备会保留最后一次被发现时的详情，通常是因为它们处于离线状态。"
        title="覆盖范围"
      >
        {!hasMachines ? (
          unavailable
        ) : (
          <p className="py-2.5 text-sm">
            上次同步包含 {machineCount - missing.length} / {machineCount} 台设备
          </p>
        )}
        {missing.length > 0 && (
          <RowList>
            {missing.map((node) => (
              <Row
                action={
                  <span className="text-muted text-sm whitespace-nowrap" suppressHydrationWarning>
                    {node.updatedAt
                      ? `详情更新于 ${formatTimeDelta(new Date(node.updatedAt))}`
                      : "暂无详情"}
                  </span>
                }
                key={node.id}
              >
                <span className="flex items-center gap-2 text-sm">
                  <StatusCircle isOnline={node.isOnline} />
                  <Link styled to={`/machines/${node.id}`}>
                    {node.name}
                  </Link>
                </span>
              </Row>
            ))}
          </RowList>
        )}
      </Section>
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <PageError error={error} page="Agent" />;
}
