import { ArrowRight } from "lucide-react";

import Link from "~/components/link";
import PageError from "~/components/page-error";
import { headscaleConfigContext, oidcContext } from "~/server/context";

import type { Route } from "./+types/overview";

export async function loader({ context }: Route.LoaderArgs) {
  const headscaleConfig = context.get(headscaleConfigContext);
  const oidc = context.get(oidcContext);

  return {
    config: headscaleConfig.writable(),
    isOidcEnabled: oidc.state === "enabled" && oidc.value.status().state === "ready",
  };
}

export default function Page({ loaderData: { config, isOidcEnabled } }: Route.ComponentProps) {
  return (
    <div className="flex max-w-(--breakpoint-lg) flex-col gap-8">
      <div className="flex w-full flex-col sm:w-2/3">
        <h1 className="mb-4 text-2xl font-medium">设置</h1>
        <p>
          设置页面仍在建设中。随着我能够添加更多功能，我会将它们加到这里。如果你需要任何功能，欢迎在 GitHub
          仓库上提交 issue。
        </p>
      </div>
      <div className="flex w-full flex-col sm:w-2/3">
        <h1 className="mb-4 text-2xl font-medium">预认证密钥</h1>
        <p>
          Headscale 完全支持预认证密钥，以便轻松将设备添加到你的 Tailnet。要了解有关使用预认证密钥的更多信息，请访问{" "}
          <Link external styled to="https://tailscale.com/kb/1085/auth-keys/">
            Tailscale 文档
          </Link>
        </p>
      </div>
      <Link to="/settings/auth-keys">
        <div className="flex items-center text-lg font-medium">
          管理认证密钥
          <ArrowRight className="ml-2 h-5 w-5" />
        </div>
      </Link>
      <div className="flex w-full flex-col sm:w-2/3">
        <h1 className="mb-4 text-2xl font-medium">Headplane 代理</h1>
        <p>
          Headplane 代理会同步来自你的 Tailnet 的节点信息，例如操作系统版本和连接详情。
        </p>
      </div>
      <Link to="/settings/agent">
        <div className="flex items-center text-lg font-medium">
          代理设置
          <ArrowRight className="ml-2 h-5 w-5" />
        </div>
      </Link>
      {config && isOidcEnabled ? (
        <>
          <div className="flex w-full flex-col sm:w-2/3">
            <h1 className="mb-4 text-2xl font-medium">认证限制</h1>
            <p>
              Headscale 支持限制 OIDC 认证，只允许特定电子邮件域名、组或用户进行认证。这可用于将你的
              Tailnet 访问限制为仅限某些用户或组，Headplane 在认证时也会遵循这些设置。{" "}
              <Link external styled to="https://headscale.net/stable/ref/oidc/#basic-configuration">
                了解更多
              </Link>
            </p>
          </div>
          <Link to="/settings/restrictions">
            <div className="flex items-center text-lg font-medium">
              管理限制
              <ArrowRight className="ml-2 h-5 w-5" />
            </div>
          </Link>
        </>
      ) : undefined}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <PageError error={error} page="设置" />;
}
