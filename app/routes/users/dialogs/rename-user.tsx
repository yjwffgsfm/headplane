import ActionDialog from "~/components/action-dialog";
import Input from "~/components/input";
import type { User } from "~/types";
import { fieldValidator } from "~/utils/form";
import { USERNAME_RULE } from "~/utils/user";

import { username } from "../schemas";

interface RenameProps {
  user: User;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const validateUsername = fieldValidator(username);

export default function RenameUser({ user, isOpen, setIsOpen }: RenameProps) {
  return (
    <ActionDialog
      description="引用旧用户名的 ACL 策略不会被更新。"
      fields={{ headscale_user_id: user.id }}
      intent="rename"
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="重命名"
      title={`重命名 ${user.name || user.displayName}`}
    >
      <Input
        defaultValue={user.name}
        description={USERNAME_RULE}
        label="用户名"
        name="name"
        required
        validate={validateUsername}
      />
    </ActionDialog>
  );
}
