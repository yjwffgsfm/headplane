import Dialog, { DialogPanel } from "~/components/dialog";
import Text from "~/components/text";
import Title from "~/components/title";
import type { Machine, User } from "~/types";

interface DeleteProps {
  user: User;
  machines: Machine[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function DeleteUser({ user, machines, isOpen, setIsOpen }: DeleteProps) {
  const name = user.name || user.displayName;

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <DialogPanel variant={machines.length > 0 ? "unactionable" : "normal"}>
        <Title>删除 {name}？</Title>
        {machines.length > 0 ? (
          <Text className="mb-6">
            拥有机器的用户无法被删除。请先删除或将其机器重新分配给其他用户，然后再继续。
          </Text>
        ) : (
          <Text className="mb-6">
            已删除的用户无法恢复。
            {user.provider === "oidc" && (
              <p className="mt-4 text-sm text-mist-600 dark:text-mist-300">
                由于该用户通过外部提供商进行身份验证，如果他们再次登录，将会被重新创建。
              </p>
            )}
          </Text>
        )}
        <input name="action_id" type="hidden" value="delete_user" />
        <input name="headscale_user_id" type="hidden" value={user.id} />
      </DialogPanel>
    </Dialog>
  );
}
