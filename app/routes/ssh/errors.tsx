import { AlertCircle } from "lucide-react";

import Card from "~/components/card";
import Link from "~/components/link";

export const sshErrors = {
  wasm_missing: {
    title: "浏览器 SSH 不可用",
    message: "此版本的 Headplane 未包含浏览器 SSH 支持。",
    anchor: "#ssh-not-available",
  },

  agent_required: {
    title: "浏览器 SSH 需要 Headplane 代理",
    message: "浏览器 SSH 仅在启用 Headplane 代理集成时可用。",
    anchor: "#agent-required",
  },

  oidc_required: {
    title: "浏览器 SSH 需要 OIDC 认证",
    message: "浏览器 SSH 仅在启用 OIDC 认证时可用。",
    anchor: "#oidc-required",
  },

  node_not_found: (hostname: string) => ({
    title: "未找到节点",
    message: `未找到主机名为 ${hostname} 的节点。`,
    anchor: "#node-not-found",
  }),

  user_not_linked: {
    title: "用户账户未关联",
    message: "您需要先将您的用户账户关联到 Headscale 用户，然后才能使用浏览器 SSH。",
    anchor: "#user-not-linked",
  },
} as const;

interface SSHErrorBoundaryProps {
  title: string;
  message: string;
  anchor: string;
}

export function isSSHError(error: unknown): error is SSHErrorBoundaryProps {
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

const DOCS_BASE = "https://headplane.net/features/ssh";

export function SSHErrorBoundary({ title, message, anchor }: SSHErrorBoundaryProps) {
  return (
    <Card className="w-screen" variant="flat">
      <div className="flex items-center justify-between gap-4">
        <Card.Title>{title}</Card.Title>
        <AlertCircle className="mb-2 h-6 w-6 text-red-500" />
      </div>
      <Card.Text>
        {message}
        <br />
        <br />
        <Link to={`${DOCS_BASE}${anchor}`} external styled>
          Headplane SSH 文档
        </Link>{" "}
      </Card.Text>
    </Card>
  );
}
