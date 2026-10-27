import ActionDialog from "~/components/action-dialog";
import type { Machine } from "~/types";

interface DeleteProps {
  machine: Machine;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Delete({ machine, isOpen, setIsOpen }: DeleteProps) {
  return (
    <ActionDialog
      description="该设备将从你的 Tailnet 网络中移除。如需重新添加，请在设备上再次登录 Tailnet 网络。"
      fields={{ node_id: machine.id }}
      intent="delete"
      isDestructive
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="移除"
      title={`移除 ${machine.givenName}？`}
    />
  );
}
