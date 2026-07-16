import { Form } from "react-router";

import Button from "~/components/button";
import Card from "~/components/card";
import Code from "~/components/code";
import Input from "~/components/input";
import Link from "~/components/link";

interface UserPromptProps {
  hostname: string;
}

export default function UserPrompt({ hostname }: UserPromptProps) {
  return (
    <div className="flex h-screen items-center justify-center">
      <Card>
        <Card.Title>输入用户名</Card.Title>
        <Card.Text className="mb-4">
          输入您要用于连接 <Code>{hostname}</Code> 的用户名。 通过 Web 的 SSH 遵循与 Headscale
          中常规 SSH 访问相同的 ACL 规则，因此只有被允许的用户名才能工作。
          <br />
          <br />
          有关常见错误，请参阅{" "}
          <Link external styled to="https://headplane.net/features/ssh#troubleshooting">
            故障排除指南
          </Link>
          。
        </Card.Text>
        <Form
          method="GET"
          onSubmit={(e) => {
            const formData = new FormData(e.currentTarget);
            const username = formData.get("user");
            if (!username) {
              e.preventDefault();
              return;
            }

            // We have to do a full navigation, since the page needs a full
            // reload to initialize the SSH connection due to us disabling the
            // revalidator.
            const url = new URL(window.location.href);
            url.searchParams.set("user", username.toString());
            window.location.assign(url.toString());
          }}
        >
          <Input
            labelHidden
            type="text"
            label="用户名"
            name="user"
            placeholder="用户名"
            className="mb-2"
            required
          />
          <Button type="submit" variant="heavy" className="w-full">
            连接
          </Button>
        </Form>
      </Card>
    </div>
  );
}
