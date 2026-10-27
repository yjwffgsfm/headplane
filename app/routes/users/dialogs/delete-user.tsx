import ActionDialog from "~/components/action-dialog";
import Callout from "~/components/callout";
import type { Machine, User } from "~/types";

interface DeleteProps {
  user: User;
  machines: Machine[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function DeleteUser({ user, machines, isOpen, setIsOpen }: DeleteProps) {
  const hasMachines = machines.length > 0;

  return (
    <ActionDialog
      description={
        user.provider === "oidc"
          ? "删除后无法恢复。这些用户通过你的 OIDC 提供商登录，再次登录时会重新创建。"
          : "删除后无法恢复。"
      }
      fields={{ headscale_user_id: user.id }}
      intent="delete"
      isDestructive
      isDisabled={hasMachines}
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="删除"
      title={`删除 ${user.name || user.displayName}？`}
    >
      {hasMachines && (
        <Callout variant="warning">
          该用户仍拥有设备。请先移除这些设备或更改它们的所有者。
        </Callout>
      )}
    </ActionDialog>
  );
}
