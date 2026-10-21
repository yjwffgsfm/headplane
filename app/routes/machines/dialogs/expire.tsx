import ActionDialog from "~/components/action-dialog";
import type { Machine } from "~/types";

interface ExpireProps {
  machine: Machine;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Expire({ machine, isOpen, setIsOpen }: ExpireProps) {
  return (
    <ActionDialog
      description="设备会从你的 Tailnet 断开，直到有人在其上重新登录。"
      fields={{ node_id: machine.id }}
      intent="expire"
      isDestructive
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="立即过期"
      title={`立即使 ${machine.givenName} 过期？`}
    />
  );
}
