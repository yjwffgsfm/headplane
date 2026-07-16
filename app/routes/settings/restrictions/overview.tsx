import { data } from "react-router";

import Link from "~/components/link";
import Notice from "~/components/notice";
import { authContext, headscaleConfigContext } from "~/server/context";
import { Capabilities } from "~/server/web/roles";

import type { Route } from "./+types/overview";
import { restrictionAction } from "./actions";
import AddDomain from "./dialogs/add-domain";
import AddGroup from "./dialogs/add-group";
import AddUser from "./dialogs/add-user";
import RestrictionTable from "./table";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const headscaleConfig = context.get(headscaleConfigContext);

  const principal = await auth.require(request);
  const check = auth.can(principal, Capabilities.read_users);
  if (!check) {
    throw data("您没有权限查看 IAM 设置。", {
      status: 403,
    });
  }

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
  };
}

export const action = restrictionAction;

export default function Page({ loaderData: { access, writable, settings } }: Route.ComponentProps) {
  const isDisabled = writable ? !access : true;

  return (
    <div className="flex max-w-(--breakpoint-lg) flex-col gap-4">
      <div className="flex w-full flex-col sm:w-2/3">
        <p className="text-md mb-4">
          <Link className="font-medium" to="/settings">
            设置
          </Link>
          <span className="mx-2">/</span> 认证限制
        </p>
        {!access ? (
          <Notice title="认证权限受限" variant="warning">
            您没有编辑认证限制设置所需的权限。请联系管理员申请权限或进行更改。
          </Notice>
        ) : !writable ? (
          <Notice title="配置已锁定" variant="error">
            Headscale 配置文件无法通过 Web 界面编辑。请确保您已正确授予 Headplane
            对该文件的写入权限。
          </Notice>
        ) : undefined}
        <h1 className="mt-4 mb-2 text-2xl font-medium">认证限制</h1>
        <p>
          Headscale 支持限制 OIDC 认证，仅允许特定邮箱域名、群组或用户进行认证。这可以用于将 Tailnet
          的访问权限限制为特定用户或群组，Headplane 在认证时也会尊重这些设置。{" "}
          <Link external styled to="https://headscale.net/stable/ref/oidc/#basic-configuration">
            了解更多
          </Link>
        </p>
      </div>
      <RestrictionTable isDisabled={isDisabled} type="domain" values={settings.domains}>
        <AddDomain domains={settings.domains} isDisabled={isDisabled} />
      </RestrictionTable>
      <RestrictionTable isDisabled={isDisabled} type="group" values={settings.groups}>
        <AddGroup groups={settings.groups} isDisabled={isDisabled} />
      </RestrictionTable>
      <RestrictionTable isDisabled={isDisabled} type="user" values={settings.users}>
        <AddUser isDisabled={isDisabled} users={settings.users} />
      </RestrictionTable>
    </div>
  );
}
