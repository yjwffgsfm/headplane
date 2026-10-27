import { useMemo, useState } from "react";
import { data } from "react-router";

import Attribute from "~/components/attribute";
import Button from "~/components/button";
import Link from "~/components/link";
import PageHeader from "~/components/page-header";
import Section, { SettingList } from "~/components/section";
import StatusCircle from "~/components/status-circle";
import {
  agentsContext,
  authContext,
  headscaleConfigContext,
  headscaleContext,
  headscaleLiveStoreContext,
  requestApiContext,
} from "~/server/context";
import { nodesResource, usersResource } from "~/server/headscale/live-store";
import { Capabilities } from "~/server/web/roles";
import { getOSInfo, getTSVersion } from "~/utils/host-info";
import { extractTagOwnerTags, isNoExpiry, mapNodes, sortAssignableTags } from "~/utils/node-info";
import { toastClientAction } from "~/utils/toast";
import { getUserDisplayName, isTaggedDevicesUser } from "~/utils/user";

import type { Route } from "./+types/machine";
import { mapTagsToComponents, uiTagsForNode } from "./components/machine-row";
import MenuOptions from "./components/menu";
import Routes from "./dialogs/routes";
import { machineAction } from "./machine-actions";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const agentsFeature = context.get(agentsContext);
  const auth = context.get(authContext);
  const getRequestApi = context.get(requestApiContext);
  const headscale = context.get(headscaleContext);
  const headscaleConfig = context.get(headscaleConfigContext);
  const headscaleLiveStore = context.get(headscaleLiveStoreContext);

  if (!params.id) {
    throw new Error("No machine ID provided");
  }

  if (params.id.endsWith(".ico")) {
    throw data(null, { status: 204 });
  }

  await auth.requireCapability(request, Capabilities.read_machines);
  const magic = headscaleConfig.getMagicDNSBaseDomain();

  const { api } = await getRequestApi(request);
  const [nodesSnap, usersSnap] = await Promise.all([
    headscaleLiveStore.get(nodesResource, api),
    headscaleLiveStore.get(usersResource, api),
  ]);
  const nodes = nodesSnap.data;
  const users = usersSnap.data;
  const node = nodes.find((node) => node.id === params.id);
  if (node == null) {
    throw data(null, { status: 404 });
  }

  const agents = agentsFeature.state === "enabled" ? agentsFeature.value : undefined;
  const [lookup, policyResult] = await Promise.allSettled([
    agents?.lookup([node.nodeKey]),
    api.policy.get(),
  ]);
  const stats = lookup.status === "fulfilled" ? lookup.value : undefined;
  const [enhancedNode] = mapNodes([node], stats);
  const tags = [...node.tags].toSorted();
  const supportsNodeOwnerChange = !headscale.capabilities.nodeOwnerIsImmutable;
  const supportsDisablingKeyExpiry = headscale.capabilities.keyExpiryCanBeDisabled;
  const agentSync = agents?.lastSync();
  const policy = policyResult.status === "fulfilled" ? policyResult.value.policy : undefined;

  return {
    agent: agentSync
      ? {
          syncedAt: agentSync.syncedAt?.toISOString() ?? null,
          nodeCount: agentSync.nodeCount,
          nodeKey: agents?.agentNodeKey(),
        }
      : undefined,
    existingTags: sortAssignableTags(nodes, policy),
    // `undefined` keeps the tag dialog from flagging every tag as undeclared.
    policyTags: extractTagOwnerTags(policy),
    magic,
    node: enhancedNode,
    stats: stats?.[enhancedNode.nodeKey],
    supportsNodeOwnerChange: supportsNodeOwnerChange,
    supportsDisablingKeyExpiry: supportsDisablingKeyExpiry,
    tags,
    users,
  };
}

export const action = machineAction;

export const clientAction = toastClientAction;

export default function Page({
  loaderData: {
    node,
    tags,
    users,
    magic,
    agent,
    stats,
    existingTags,
    policyTags,
    supportsNodeOwnerChange,
    supportsDisablingKeyExpiry,
  },
}: Route.ComponentProps) {
  const [showRouting, setShowRouting] = useState(false);

  const uiTags = useMemo(() => {
    const tags = uiTagsForNode(node, agent?.nodeKey === node.nodeKey);
    return tags;
  }, [node, agent]);

  const { subnetApprovedRoutes, subnetWaitingRoutes, exitRoutes, exitApproved } =
    node.customRouting;
  const exitStatus =
    exitRoutes.length === 0 ? "未通告" : exitApproved ? "已批准" : "等待批准";

  return (
    <div className="max-w-5xl">
      <nav aria-label="面包屑导航" className="text-muted mb-3 text-sm">
        <Link className="hover:text-fg" to="/machines">
          设备
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-fg">{node.givenName}</span>
      </nav>
      <PageHeader
        actions={
          <MenuOptions
            existingTags={existingTags}
            policyTags={policyTags}
            isFullButton
            magic={magic}
            node={node}
            users={users}
            supportsNodeOwnerChange={supportsNodeOwnerChange}
            supportsDisablingKeyExpiry={supportsDisablingKeyExpiry}
          />
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {node.user && !(isTaggedDevicesUser(node.user) && tags.length) ? (
              <span>{getUserDisplayName(node.user)}</span>
            ) : undefined}
            {tags.map((tag) => (
              <span className="font-mono" key={tag}>
                {tag}
              </span>
            ))}
            {mapTagsToComponents(node, uiTags)}
          </span>
        }
        title={
          <span className="flex items-center gap-2">
            <StatusCircle isExpired={node.expired} isOnline={node.online && !node.expired} />
            {node.givenName}
          </span>
        }
      />
      <Routes isOpen={showRouting} node={node} setIsOpen={setShowRouting} />
      <Section
        action={<Button onClick={() => setShowRouting(true)}>编辑路由</Button>}
        description={
          <>
            对外暴露子网，或让所有流量经由这台设备转发。<Link external styled to="https://tailscale.com/kb/1019/subnets">
              文档
            </Link>
          </>
        }
        title="路由"
      >
        <SettingList>
          <Attribute
            isMono={subnetApprovedRoutes.length > 0}
            name="子网路由"
            tooltip="发往这些路由的流量会经由这台设备转发。"
            value={subnetApprovedRoutes.length > 0 ? subnetApprovedRoutes.join("\n") : "无"}
          />
          {subnetWaitingRoutes.length > 0 ? (
            <Attribute
              isMono
              name="等待批准"
              tooltip="这台设备通告了这些路由，但必须先获得批准，流量才会发往这些路由。"
              value={subnetWaitingRoutes.join("\n")}
            />
          ) : undefined}
          <Attribute
            name="出口节点"
            tooltip="这台设备是否能为你的 Tailnet 网络转发所有互联网流量。"
            value={exitStatus}
          />
        </SettingList>
      </Section>
      <Section description="这台设备的所有者及其运行的系统。" title="设备">
        <SettingList>
          <Attribute name="所有者" value={node.user ? getUserDisplayName(node.user) : "标签所有"} />
          <Attribute name="设备名称" value={node.givenName} />
          <Attribute
            name="系统主机名"
            tooltip="由设备的操作系统上报，并用作默认设备名称。"
            value={node.name}
          />
          {stats ? (
            <>
              <Attribute name="操作系统" value={getOSInfo(stats)} />
              <Attribute isMono name="Tailscale 版本" value={getTSVersion(stats)} />
            </>
          ) : undefined}
          <Attribute name="创建时间" value={new Date(node.createdAt).toLocaleString()} />
          <Attribute
            name="最后活跃"
            value={node.online ? "已连接" : new Date(node.lastSeen).toLocaleString()}
          />
          <Attribute
            name="密钥过期"
            value={!isNoExpiry(node.expiry) ? new Date(node.expiry!).toLocaleString() : "从不"}
          />
          <Attribute
            isMono
            name="ID"
            tooltip="用于在 Headscale API 中引用这台设备。"
            value={node.id}
          />
          <Attribute
            isCopyable
            isMono
            name="节点密钥"
            tooltip="唯一标识这台设备的公钥。"
            value={node.nodeKey}
          />
        </SettingList>
      </Section>
      <Section description="Tailnet 网络中的其他设备如何访问这台设备。" title="地址">
        <SettingList>
          <Attribute
            isCopyable
            isMono
            name="Tailscale IPv4"
            tooltip="这台设备在 Tailnet 网络中的 IPv4 地址。"
            value={getIpv4Address(node.ipAddresses)}
          />
          <Attribute
            isCopyable
            isMono
            name="Tailscale IPv6"
            tooltip="这台设备在 Tailnet 网络中的 IPv6 地址。即使你的 ISP 不支持 IPv6，IPv6 也能在 Tailnet 网络内正常使用。"
            value={getIpv6Address(node.ipAddresses)}
          />
          <Attribute
            isCopyable
            isMono
            name="短域名"
            tooltip="Tailnet 网络中的设备可以通过这个名称访问这台设备。"
            value={node.givenName}
          />
          {magic ? (
            <Attribute
              isCopyable
              isMono
              name="完整域名"
              tooltip="这台设备的完整 MagicDNS 名称。"
              value={`${node.givenName}.${magic}`}
            />
          ) : undefined}
        </SettingList>
      </Section>
      {stats ? (
        <Section
          description="设备上报的网络信息，排查连接问题时很有用。"
          title="连接性"
        >
          <SettingList>
            {stats.Endpoints ? (
              <Attribute isMono name="端点" value={stats.Endpoints.join("\n")} />
            ) : undefined}
            <Attribute
              name="随目的地变化"
              tooltip="设备是否位于会根据目的地改变其 IP 地址的复杂 NAT 之后。"
              value={stats.NetInfo?.MappingVariesByDestIP ? "是" : "否"}
            />
            <Attribute
              name="发夹 NAT"
              tooltip="设备是否需要在支持发夹 NAT 的 NAT 环境中通信。"
              value={stats.NetInfo?.HairPinning ? "是" : "否"}
            />
            <Attribute name="IPv6" value={stats.NetInfo?.WorkingIPv6 ? "是" : "否"} />
            <Attribute name="UDP" value={stats.NetInfo?.WorkingUDP ? "是" : "否"} />
            <Attribute name="UPnP" value={stats.NetInfo?.UPnP ? "是" : "否"} />
            <Attribute name="PCP" value={stats.NetInfo?.PCP ? "是" : "否"} />
            <Attribute name="NAT-PMP" value={stats.NetInfo?.PMP ? "是" : "否"} />
          </SettingList>
        </Section>
      ) : undefined}
    </div>
  );
}

function getIpv4Address(addresses: string[]) {
  for (const address of addresses) {
    if (address.startsWith("100.")) {
      // Return the first CGNAT address
      return address;
    }
  }

  return "—";
}

function getIpv6Address(addresses: string[]) {
  for (const address of addresses) {
    if (address.startsWith("fd")) {
      // Return the first IPv6 address
      return address;
    }
  }

  return "—";
}
