import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Form, Link as RouterLink, redirect, useSearchParams } from "react-router";

import Button from "~/components/button";
import Card from "~/components/card";
import Code from "~/components/code";
import Input from "~/components/input";
import Link from "~/components/link";
import { appConfigContext, authContext, oidcContext } from "~/server/context";
import type { OidcError, OidcService } from "~/server/oidc/provider";
import { useLiveData } from "~/utils/live-data";
import log from "~/utils/log";

import type { Route } from "./+types/page";
import { loginAction } from "./action";
import { OidcConfigErrorNotice, OidcDiscoveryFailedNotice } from "./config-error";
import Logout from "./logout";
import { OidcErrorNotice } from "./oidc-error";

export async function loader({ request, context, url }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const config = context.get(appConfigContext);
  const oidc = context.get(oidcContext);

  try {
    await auth.require(request);
    return redirect("/machines");
  } catch {}

  const qp = url.searchParams;
  const urlState = qp.get("s") ?? undefined;

  const oidcService = oidc.state === "enabled" ? oidc.value : undefined;
  let oidcStatus: ReturnType<OidcService["status"]> | undefined;
  if (oidcService) {
    try {
      const result = await oidcService.discover();
      if (!result.ok) {
        logLoginOidcError("OIDC discovery failed", result.error);
      }
    } catch (error) {
      log.error("auth", "OIDC discovery failed unexpectedly: %s", String(error));
      log.debug("auth", "OIDC discovery error details: %o", error);
    }

    oidcStatus = oidcService.status();
  }

  if (
    oidcService &&
    config.oidc?.disable_api_key_login &&
    oidcStatus?.state === "ready" &&
    urlState !== "logout"
  ) {
    return redirect("/oidc/start");
  }

  const isOidcConnectorEnabled = oidcStatus?.state === "ready";
  const oidcErrorCodes = oidcStatus?.state === "error" ? [oidcStatus.error.code] : [];

  return {
    isCookieSecureEnabled: config.server.cookie_secure,
    isOidcConnectorEnabled,
    oidcErrorCodes,
    urlState,
  };
}

export const action = loginAction;

function logLoginOidcError(context: string, error: OidcError): void {
  log.error("auth", "%s [%s]: %s", context, error.code, error.message);
  if (error.hint) {
    log.error("auth", "Hint: %s", error.hint);
  }
}

export default function Page({ loaderData, actionData }: Route.ComponentProps) {
  const { isCookieSecureEnabled, isOidcConnectorEnabled, oidcErrorCodes, urlState } = loaderData;

  const [showCookieWarning, setShowCookieWarning] = useState(false);
  const [params] = useSearchParams();
  const { pause } = useLiveData();

  useEffect(() => {
    // This page does NOT need stale while revalidate logic
    pause();

    if (isCookieSecureEnabled && window.location.protocol !== "https:") {
      setShowCookieWarning(true);
    }
  });

  useEffect(() => {
    // State is a one time thing, we need to remove it after it has
    // Been consumed to prevent logic loops.
    if (urlState !== null) {
      const searchParams = new URLSearchParams(params);
      searchParams.delete("s");

      // Replacing because it's not a navigation, just a cleanup of the URL
      // We can't use the useSearchParams method since it revalidates
      // Which will trigger a full reload
      const newUrl = searchParams.toString()
        ? `{${window.location.pathname}?${searchParams.toString()}`
        : window.location.pathname;

      window.history.replaceState(null, "", newUrl);
    }
  }, [urlState, params]);

  if (urlState === "logout") {
    return <Logout />;
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div>
        {urlState?.startsWith("error_") ? (
          <OidcErrorNotice code={urlState} />
        ) : oidcErrorCodes.includes("discovery_failed") ? (
          <OidcDiscoveryFailedNotice />
        ) : oidcErrorCodes.length > 0 ? (
          <OidcConfigErrorNotice errors={oidcErrorCodes} />
        ) : showCookieWarning ? (
          <Card className="m-4 mb-4 max-w-md border border-red-500 sm:m-0 sm:mb-4">
            <div className="flex items-center justify-between gap-4">
              <Card.Title className="text-red-500">配置问题</Card.Title>
              <AlertCircle className="mb-2 h-6 w-6 text-red-500" />
            </div>
            {showCookieWarning ? (
              <Card.Text className="text-sm">
                Headplane 配置为使用安全 Cookie，但当前通过不安全的连接访问，登录将无法正常工作。{" "}
                <Link
                  external
                  styled
                  to="https://headplane.net/configuration/common-issues#issue-logging-in-does-not-do-anything"
                >
                  了解更多。
                </Link>
              </Card.Text>
            ) : undefined}
          </Card>
        ) : undefined}
        <Card className="m-4 max-w-md sm:m-0">
          <Card.Title>欢迎使用 Headplane</Card.Title>
          <Form method="POST">
            <Card.Text>
              请输入 API 密钥进行身份验证，可通过运行 <Code>headscale apikeys create</Code>{" "}
              命令生成。
            </Card.Text>
            <Input
              className="mt-8 mb-2"
              required
              label="API 密钥"
              labelHidden
              name="api_key"
              placeholder="API 密钥"
              type="password"
            />
            {actionData?.success === false ? (
              <Card.Text className="mb-2 text-sm text-red-600 dark:text-red-300">
                {actionData.message}
              </Card.Text>
            ) : undefined}
            <Button className="w-full" type="submit" variant="heavy">
              登录
            </Button>
          </Form>
          {isOidcConnectorEnabled ? (
            <RouterLink to="/oidc/start" prefetch="none" reloadDocument>
              <Button className="mt-2 w-full" disabled={oidcErrorCodes.length > 0} variant="light">
                单点登录
              </Button>
            </RouterLink>
          ) : undefined}
        </Card>
      </div>
    </div>
  );
}
