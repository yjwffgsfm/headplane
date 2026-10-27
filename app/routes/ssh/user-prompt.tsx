import { Form } from "react-router";

import Button from "~/components/button";
import Input from "~/components/input";
import Link from "~/components/link";
import Shell from "~/routes/auth/login/shell";

import { SSH_DOCS_URL } from "./errors";

interface UserPromptProps {
  hostname: string;
}

export default function UserPrompt({ hostname }: UserPromptProps) {
  return (
    <Shell
      description="选择要登录使用的用户。策略中的 SSH 规则决定允许使用哪些用户。"
      title={`连接到 ${hostname}`}
    >
      <Form
        className="flex flex-col gap-3"
        method="GET"
        onSubmit={(e) => {
          const formData = new FormData(e.currentTarget);
          const username = formData.get("user");
          if (!username) {
            e.preventDefault();
            return;
          }

          // The page needs a full reload to start the SSH connection, since
          // revalidation is disabled for this route.
          e.preventDefault();
          const url = new URL(window.location.href);
          url.searchParams.set("user", username.toString());
          window.location.assign(url.toString());
        }}
      >
        <Input autoComplete="off" label="用户名" name="user" required spellCheck={false} />
        <Button className="w-full" type="submit" variant="primary">
          连接
        </Button>
      </Form>
      <p className="text-muted mt-6 text-sm">
        无法连接？请查看<Link external styled to={`${SSH_DOCS_URL}#troubleshooting`}>
          故障排查
        </Link>。
      </p>
    </Shell>
  );
}
