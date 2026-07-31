import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import Text from "~/components/text";
import Title from "~/components/title";
import { User } from "~/types";

interface RenameProps {
  user: User;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

// TODO: Server side validation before submitting
export default function RenameUser({ user, isOpen, setIsOpen }: RenameProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <DialogPanel>
        <Title>重命名 {user.name || user.displayName}？</Title>
        <Text className="mb-6">
          为 {user.name || user.displayName} 输入一个新的用户名。更改用户名不会更新任何可能以旧用户名引用该用户的 ACL 策略。
        </Text>
        <input name="action_id" type="hidden" value="rename_user" />
        <input name="headscale_user_id" type="hidden" value={user.id} />
        <Input
          defaultValue={user.name}
          required
          label="用户名"
          name="new_name"
          placeholder="my-new-name"
        />
      </DialogPanel>
    </Dialog>
  );
}
