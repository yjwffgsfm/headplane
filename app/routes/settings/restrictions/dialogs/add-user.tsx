import { type } from "arktype";

import Button from "~/components/button";
import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import Text from "~/components/text";
import Title from "~/components/title";
import { useForm } from "~/hooks/use-form";

const userSchema = type({
  user: "string > 0",
});

interface AddUserProps {
  users: string[];
  isDisabled?: boolean;
}

export default function AddUser({ users, isDisabled }: AddUserProps) {
  const form = useForm({
    schema: userSchema,
    validate: (values) => {
      const user = (values.user as string).trim();
      if (user.length === 0) return undefined;

      if (users.includes(user)) {
        return { user: "此用户已存在于列表中。" };
      }

      return undefined;
    },
  });

  return (
    <Dialog>
      <Button disabled={isDisabled}>添加用户</Button>
      <DialogPanel>
        <Title>添加用户</Title>
        <Text className="mb-4">
          将此用户添加到允许的用户列表中，这些用户可以通过 OIDC 在 Headscale 上进行认证。
        </Text>
        <input name="action_id" type="hidden" value="add_user" />
        <Input
          {...form.field("user")}
          description="允许进行 OIDC 认证的用户。"
          required
          label="用户"
          placeholder="john_doe"
        />
      </DialogPanel>
    </Dialog>
  );
}
