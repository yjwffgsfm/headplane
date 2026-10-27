import { data, Form, Link as RouterLink, redirect, useNavigation } from "react-router";

import Button from "~/components/button";
import Select from "~/components/select";
import { authContext } from "~/server/context";
import { isUserPrincipal } from "~/server/web/auth";
import { autoLink, listPickableUsers } from "~/server/web/link";
import { Capabilities } from "~/server/web/roles";

import type { Route } from "./+types/link";
import Shell, { SignedIn } from "./login/shell";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  let principal: Awaited<ReturnType<typeof auth.require>>;

  try {
    principal = await auth.require(request);
  } catch {
    return redirect("/login");
  }

  if (!isUserPrincipal(principal) || principal.user.headscaleUserId) {
    return redirect("/");
  }

  if (await autoLink({ request, context }, principal)) {
    return redirect("/");
  }

  if (!auth.can(principal, Capabilities.write_users)) {
    return redirect("/");
  }

  const users = await listPickableUsers({ request, context });
  if (users.length === 0) {
    return redirect("/");
  }

  return { email: principal.profile.email ?? principal.profile.name, users };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const principal = await auth.require(request);
  if (
    !isUserPrincipal(principal) ||
    principal.user.headscaleUserId ||
    !auth.can(principal, Capabilities.write_users)
  ) {
    return redirect("/");
  }

  const formData = await request.formData();
  const headscaleUserId = formData.get("headscale_user_id")?.toString();
  const users = await listPickableUsers({ request, context });

  const isPickable = users.some((u) => u.id === headscaleUserId);
  if (!isPickable || !(await auth.linkHeadscaleUser(principal.user.id, headscaleUserId!))) {
    return data({ message: "该用户已无法关联。请选择其他用户。" }, { status: 400 });
  }

  return redirect("/");
}

export default function Page({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();

  return (
    <Shell
      description="Headplane 无法将你的登录匹配到 Headscale 用户。请选择属于你的那个。"
      title="关联你的账号"
    >
      <Form className="flex flex-col gap-3" method="POST">
        <Select
          errorMessage={actionData?.message}
          invalid={actionData !== undefined}
          items={loaderData.users.map((u) => ({ value: u.id, label: u.name }))}
          label="Headscale 用户"
          name="headscale_user_id"
          placeholder="选择用户"
          required
        />
        <Button
          className="w-full"
          pending={navigation.state === "submitting"}
          type="submit"
          variant="primary"
        >
          关联账号
        </Button>
        <Button className="w-full" nativeButton={false} render={<RouterLink to="/" />}>
          暂时跳过
        </Button>
      </Form>
      <p className="text-muted mt-6 text-sm">
        你将以此用户的身份添加设备并创建认证密钥。之后可以在用户页面更改。
      </p>
      <SignedIn name={loaderData.email} />
    </Shell>
  );
}
