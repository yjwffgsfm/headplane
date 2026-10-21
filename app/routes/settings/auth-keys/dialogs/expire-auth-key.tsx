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
      description="该密钥会立即对新设备停止生效。"
      fields={{ key_id: authKey.id, key: authKey.key, user_id: user.id }}
      intent="expire"
      isDestructive
      submitLabel="使密钥过期"
      title="确定要使此认证密钥过期吗？"
      trigger={<RemoveButton>过期</RemoveButton>}
    />
  );
}
