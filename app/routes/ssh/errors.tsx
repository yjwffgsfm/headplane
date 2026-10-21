import { Link as RouterLink } from "react-router";

import Button from "~/components/button";
import Shell from "~/routes/auth/login/shell";

export const sshErrors = {
  wasm_missing: {
    title: "浏览器 SSH 不可用",
    message: "此版本的 Headplane 未包含浏览器 SSH。",
    anchor: "#ssh-not-available",
  },

  agent_required: {
    title: "浏览器 SSH 需要 Agent",
    message: "启用 Headplane Agent 后即可使用浏览器 SSH。",
    anchor: "#agent-required",
  },

  oidc_required: {
    title: "浏览器 SSH 需要单点登录 (SSO)",
    message: "请使用单点登录 (SSO) 登录后使用浏览器 SSH。API 密钥会话没有对应的 Headscale 用户。",
    anchor: "#oidc-required",
  },

  node_not_found: (hostname: string) => ({
    title: "未找到设备",
    message: `没有名为 ${hostname} 的设备。它可能已被重命名或移除。`,
    anchor: "#node-not-found",
  }),

  user_not_linked: {
    title: "你的账户尚未关联",
    message:
      "浏览器 SSH 会以你的 Headscale 用户身份连接。请联系管理员将你的账户关联到一个 Headscale 用户。",
    anchor: "#user-not-linked",
  },
} as const;

interface SSHErrorProps {
  title: string;
  message: string;
  anchor: string;
}

export function isSSHError(error: unknown): error is SSHErrorProps {
  return (
    typeof error === "object" &&
    error !== null &&
    "title" in error &&
    "message" in error &&
    "anchor" in error &&
    typeof error.title === "string" &&
    typeof error.message === "string" &&
    typeof error.anchor === "string"
  );
}

export const SSH_DOCS_URL = "https://headplane.net/features/ssh";

export function SSHError({ title, message, anchor }: SSHErrorProps) {
  return (
    <Shell description={message} title={title}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          nativeButton={false}
          render={<a href={`${SSH_DOCS_URL}${anchor}`} rel="noreferrer" target="_blank" />}
          variant="primary"
        >
          阅读文档
        </Button>
        <Button nativeButton={false} render={<RouterLink reloadDocument to="/" />}>
          前往 Headplane
        </Button>
      </div>
    </Shell>
  );
}
