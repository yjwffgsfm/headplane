import ActionDialog from "~/components/action-dialog";
import { RemoveButton } from "~/components/section";
import type { PreAuthKey, User } from "~/types";

interface ExpireAuthKeyProps {
  authKey: PreAuthKey;
  user: User;
}

export default function ExpireAuthKey({ authKey, user }: ExpireAuthKeyProps) {
  return (
    <ActionDialog
      description="该密钥会立即停止对新设备生效。"
      fields={{ key_id: authKey.id, user_id: user.id }}
      intent="expire"
      isDestructive
      submitLabel="使密钥过期"
      title="使此认证密钥过期？"
      trigger={<RemoveButton>设为过期</RemoveButton>}
    />
  );
}
