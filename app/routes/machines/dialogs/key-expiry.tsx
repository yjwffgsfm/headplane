import ActionDialog from "~/components/action-dialog";
import type { Machine } from "~/types";
import { isNoExpiry } from "~/utils/node-info";

interface KeyExpiryProps {
  machine: Machine;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function KeyExpiry({ machine, isOpen, setIsOpen }: KeyExpiryProps) {
  const isDisabling = !isNoExpiry(machine.expiry);

  return (
    <ActionDialog
      description={
        isDisabling
          ? "设备会保持登录状态，直到你使其过期或将其移除。"
          : "密钥过期后，设备需要重新登录。"
      }
      fields={{ node_id: machine.id, disable_expiry: String(isDisabling) }}
      intent="toggle_expiry"
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel={isDisabling ? "禁用密钥过期" : "启用密钥过期"}
      title={`${isDisabling ? "禁用" : "启用"} ${machine.givenName} 的密钥过期？`}
    />
  );
}
