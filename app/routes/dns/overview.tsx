import { useLoaderData } from "react-router";

import Callout from "~/components/callout";
import Link from "~/components/link";
import PageError from "~/components/page-error";
import PageHeader from "~/components/page-header";
import { authContext, headscaleConfigContext, integrationContext } from "~/server/context";
import { Capabilities } from "~/server/web/roles";
import { toastClientAction } from "~/utils/toast";

import type { Route } from "./+types/overview";
import General from "./components/general";
import ManageDomains from "./components/manage-domains";
import ManageNS from "./components/manage-ns";
import ManageRecords from "./components/manage-records";
import { dnsAction } from "./dns-actions";

// We do not want to expose every config value
export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const headscaleConfig = context.get(headscaleConfigContext);

  const principal = await auth.requireCapability(request, Capabilities.read_network);

  // Without Headscale's config there's no DNS page, as the hidden tab suggests.
  if (!headscaleConfig.readable()) {
    throw new Response(null, { status: 404 });
  }

  const writablePermission = auth.can(principal, Capabilities.write_network);

  const dns = headscaleConfig.getDNSConfig();

  return {
    ...dns,
    access: writablePermission,
    writable: headscaleConfig.writable(),
    hasRecordsFile: headscaleConfig.hasRecordsFile(),
    recordsWritable: headscaleConfig.recordsWritable(),
    isAutoApplied: context.get(integrationContext) !== undefined,
  };
}

export const action = dnsAction;

export const clientAction = toastClientAction;

export default function Page() {
  const data = useLoaderData<typeof loader>();
  const isDisabled = data.access === false || data.writable === false;

  return (
    <>
      <PageHeader
        description={
          <>
            控制 Tailnet 网络中的设备如何解析名称。参阅{" "}
            <Link external styled to="https://headscale.net/stable/ref/dns">
              DNS 文档
            </Link>
          </>
        }
        title="DNS"
      />
      <div className="max-w-5xl">
        {isDisabled && (
          <Callout className="mb-6">
            {data.writable
              ? "你的权限不允许更改 DNS 设置。"
              : "Headscale 配置为只读，因此无法在此更改 DNS 设置。"}
          </Callout>
        )}
        {!isDisabled && !data.isAutoApplied && (
          <Callout className="mb-6" variant="warning">
            更改会保存到 Headscale 配置，但只有在 Headscale 重启后才会生效。设置<Link external styled to="https://headplane.net/configuration/integrations">
              集成
            </Link>即可自动重启。
          </Callout>
        )}
        <General
          baseDomain={data.baseDomain}
          isDisabled={isDisabled}
          isMagicDns={data.magicDns}
          isOverrideDns={data.overrideDns}
        />
        <ManageNS global={data.nameservers} isDisabled={isDisabled} split={data.splitDns} />
        <ManageRecords
          hasRecordsFile={data.hasRecordsFile}
          isDisabled={isDisabled}
          isReadOnly={!data.recordsWritable}
          records={data.extraRecords}
        />
        <ManageDomains
          isDisabled={isDisabled}
          magic={data.magicDns ? data.baseDomain : undefined}
          searchDomains={data.searchDomains}
        />
      </div>
    </>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  return <PageError error={error} page="DNS 设置" />;
}
