import Button from "~/components/button";
import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import Text from "~/components/text";
import Title from "~/components/title";

interface CreateUserProps {
  isOidc?: boolean;
  isDisabled?: boolean;
}

export default function CreateUser({ isOidc, isDisabled }: CreateUserProps) {
  return (
    <Dialog>
      <Button disabled={isDisabled}>添加用户</Button>
      <DialogPanel>
        <Title>创建 Headscale 用户</Title>
        <Text className="mb-6">
          这将在 Headscale 中创建一个新用户。该用户将出现在“未关联的 Headscale 用户”部分，直到他们
          {isOidc ? " 通过您的 OIDC 提供商登录" : " 登录"}并自动关联到 Headplane 账户。
        </Text>
        <input name="action_id" type="hidden" value="create_user" />
        <div className="flex flex-col gap-4">
          <Input required label="用户名" name="username" placeholder="my-new-user" type="text" />
          <Input label="显示名称" name="display_name" placeholder="John Doe" type="text" />
          <Input label="邮箱" name="email" placeholder="name@example.com" type="email" />
        </div>
      </DialogPanel>
    </Dialog>
  );
}