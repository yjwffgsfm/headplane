import { data } from "react-router";

import Callout from "~/components/callout";
import Link from "~/components/link";
import PageError from "~/components/page-error";
import PageHeader from "~/components/page-header";
import { authContext, headscaleConfigContext, integrationContext } from "~/server/context";
import { Capabilities } from "~/server/web/roles";
import { toastClientAction } from "~/utils/toast";

import type { Route } from "./+types/overview";
import { restrictionAction } from "./actions";
import RestrictionSection from "./restriction-section";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const headscaleConfig = context.get(headscaleConfigContext);

  const principal = await auth.requireCapability(request, Capabilities.read_users);

  const oidc = headscaleConfig.getOIDCConfig();
  if (!oidc) {
    throw data("此 Headscale 实例未配置 OIDC。", {
      status: 501,
    });
  }

  return {
    access: auth.can(principal, Capabilities.configure_iam),
    settings: {
      domains: [...new Set(oidc.allowedDomains)],
      groups: [...new Set(oidc.allowedGroups)],
      users: [...new Set(oidc.allowedUsers)],
    },
    writable: headscaleConfig.writable(),
    isAutoApplied: context.get(integrationContext) !== undefined,
  };
}

export const action = restrictionAction;
export const clientAction = toastClientAction;

export default function Page({
  loaderData: { access, writable, isAutoApplied, settings },
}: Route.ComponentProps) {
  const isDisabled = !writable || !access;

  return (
    <>
      <PageHeader
        isSubpage
        description={
          <>
            限制谁可以通过 OIDC 登录。Headscale 和 Headplane 都会执行这些限制。<Link external styled to="https://headscale.net/stable/ref/oidc/#basic-configuration">
              文档
            </Link>
          </>
        }
        title="登录限制"
      />
      {isDisabled && (
        <Callout className="mb-6">
          {access
            ? "Headscale 配置为只读，因此无法在此更改限制。"
            : "你的权限不允许更改登录限制。"}
        </Callout>
      )}
      {!isDisabled && !isAutoApplied && (
        <Callout className="mb-6" variant="warning">
          更改会保存到 Headscale 配置，但仅在 Headscale 重启后生效。配置一个
          <Link external styled to="https://headplane.net/configuration/integrations">
            集成
          </Link>
          即可自动重启。
        </Callout>
      )}
      <RestrictionSection isDisabled={isDisabled} type="domain" values={settings.domains} />
      <RestrictionSection isDisabled={isDisabled} type="group" values={settings.groups} />
      <RestrictionSection isDisabled={isDisabled} type="user" values={settings.users} />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <PageError error={error} page="登录限制" />;
}
