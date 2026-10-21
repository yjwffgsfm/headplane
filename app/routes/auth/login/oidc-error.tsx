import Callout from "~/components/callout";
import Code from "~/components/code";

export function OidcErrorNotice({ code }: { code: string }) {
  return (
    <Callout className="mb-6" title="单点登录失败" variant="error">
      {getErrorMessage(code)}
    </Callout>
  );
}

function getErrorMessage(code: string) {
  switch (code) {
    case "error_no_query":
      return (
        <p>
          SSO 提供方未能携带必需参数正确重定向回 Headplane。请确认 SSO 提供方配置正确。
        </p>
      );

    case "error_no_session":
    case "error_invalid_session":
      return (
        <p>
          由于会话数据缺失或无效，无法完成 SSO 登录。请确认 Headplane 的 Cookie 配置正确，并且浏览器允许使用 Cookie。
        </p>
      );

    case "error_no_sub":
      return (
        <p>
          SSO 提供方未返回有效的用户标识。请确认 SSO 提供方已正确配置以提供 <Code>sub</Code> 声明。
        </p>
      );

    case "error_auth_failed":
      return (
        <p>
          使用 SSO 提供方认证失败，请稍后重试。Headplane 日志中可能有更多信息。
        </p>
      );

    default:
      return <p>OIDC 认证过程中发生未知错误，请稍后重试。</p>;
  }
}
