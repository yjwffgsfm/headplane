import Callout from "~/components/callout";
import Code from "~/components/code";
import Link from "~/components/link";
import type { OidcErrorCode } from "~/server/oidc/provider";

export function OidcDiscoveryFailedNotice() {
  return (
    <Callout className="mb-6" title="单点登录不可用" variant="warning">
      Headplane 目前无法连接你的身份提供方。你仍可使用 API 密钥登录。
    </Callout>
  );
}

export function OidcConfigErrorNotice({ errors }: { errors: OidcErrorCode[] }) {
  return (
    <Callout className="mb-6" title="单点登录配置有误" variant="error">
      <ul className="list-inside list-disc">
        {mapOidcErrorsToMessages(errors).map((code) => (
          <li key={code.key}>{code.node}</li>
        ))}
      </ul>
      <Link external styled to="https://headplane.net/features/sso#troubleshooting">
        故障排查
      </Link>
    </Callout>
  );
}

function mapOidcErrorsToMessages(errors: OidcErrorCode[]) {
  const messages: {
    key: string;
    node: React.ReactNode;
  }[] = [];

  for (const error of errors) {
    switch (error) {
      case "invalid_api_key": {
        messages.push({
          key: error,
          node: (
            <span>
              用于 OIDC 认证的 API 密钥无效。请确认{" "}
              <Code>headscale.api_key</Code> 是有效的 API 密钥。
            </span>
          ),
        });
        break;
      }

      case "missing_endpoints": {
        messages.push({
          key: error,
          node: (
            <span>
              OIDC 提供方缺少必需的端点。请确认发现 URL 正确，或在配置中手动覆盖端点。
            </span>
          ),
        });
        break;
      }

      case "discovery_failed": {
        messages.push({
          key: error,
          node: (
            <span>
              无法连接 OIDC 提供方进行发现。SSO 将在下次登录时重试。
            </span>
          ),
        });
        break;
      }

      default: {
        messages.push({
          key: error,
          node: (
            <span>
              发生了未知的 OIDC 配置错误。请查看 Headplane 日志以获取更多信息。
            </span>
          ),
        });
        break;
      }
    }
  }

  return messages;
}
