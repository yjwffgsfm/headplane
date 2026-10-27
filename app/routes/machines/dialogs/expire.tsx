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
      description="该设备将断开与 Tailnet 网络的连接，直到有人再次在该设备上登录。"
      fields={{ node_id: machine.id }}
      intent="expire"
      isDestructive
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="立即过期"
      title={`让 ${machine.givenName} 立即过期？`}
    />
  );
}
