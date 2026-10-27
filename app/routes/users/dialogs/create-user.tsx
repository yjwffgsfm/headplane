import { Plus } from "lucide-react";

import ActionDialog from "~/components/action-dialog";
import Button from "~/components/button";
import Input from "~/components/input";
import { fieldValidator } from "~/utils/form";
import { USERNAME_RULE } from "~/utils/user";

import { username } from "../schemas";

interface CreateUserProps {
  isOidc?: boolean;
  isDisabled?: boolean;
}

const validateUsername = fieldValidator(username);

export default function CreateUser({ isOidc, isDisabled }: CreateUserProps) {
  return (
    <ActionDialog
      description={`在登录之前，用户会显示在“未关联的 Headscale 用户”下，${
        isOidc ? "通过你的 OIDC 提供商" : ""
      }登录后即会关联到 Headplane 账户。`}
      intent="create"
      submitLabel="创建用户"
      title="创建 Headscale 用户"
      trigger={
        <Button disabled={isDisabled} variant="primary">
          <Plus className="size-3.5" />
          添加用户
        </Button>
      }
    >
      <Input
        description={USERNAME_RULE}
        label="用户名"
        name="name"
        placeholder="my-new-user"
        required
        validate={validateUsername}
      />
      <Input label="显示名称" name="display_name" placeholder="张三" />
      <Input label="邮箱" name="email" placeholder="name@example.com" type="email" />
    </ActionDialog>
  );
}
