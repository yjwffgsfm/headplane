import Button from "~/components/button";
import Dialog, { DialogPanel } from "~/components/dialog";
import Text from "~/components/text";
import Title from "~/components/title";
import type { PreAuthKey, User } from "~/types";

interface ExpireAuthKeyProps {
  authKey: PreAuthKey;
  user: User;
}

export default function ExpireAuthKey({ authKey, user }: ExpireAuthKeyProps) {
  return (
    <Dialog>
      <Button variant="heavy">使密钥过期</Button>
      <DialogPanel variant="destructive">
        <Title>使认证密钥过期？</Title>
        <input name="action_id" type="hidden" value="expire_preauthkey" />
        <input name="user_id" type="hidden" value={user.id} />
        <input name="key_id" type="hidden" value={authKey.id} />
        <input name="key" type="hidden" value={authKey.key} />
        <Text>
          使此认证密钥过期将立即阻止它用于认证新设备。此操作无法撤销。
        </Text>
      </DialogPanel>
    </Dialog>
  );
}
