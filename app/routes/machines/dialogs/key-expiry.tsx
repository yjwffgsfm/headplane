import ActionDialog from "~/components/action-dialog";
import { KEY_EXPIRY_DAYS } from "~/server/headscale/api/resources/nodes";
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
          ? "该设备将保持登录状态，直到你让它过期或将其移除。"
          : `密钥将在 ${KEY_EXPIRY_DAYS} 天后过期，届时该设备需要重新登录。`
      }
      fields={{ node_id: machine.id, disable_expiry: String(isDisabling) }}
      intent="toggle_expiry"
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel={isDisabling ? "关闭密钥过期" : "启用密钥过期"}
      title={`${isDisabling ? "关闭" : "启用"} ${machine.givenName} 的密钥过期？`}
    />
  );
}
