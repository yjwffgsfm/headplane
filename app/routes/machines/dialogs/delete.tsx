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
      description="设备将从你的 Tailnet 中移除。如需重新添加，请在该设备上重新登录 Tailnet。"
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
