import Button from "~/components/button";
import Dialog, { DialogPanel } from "~/components/dialog";
import Text from "~/components/text";
import Title from "~/components/title";

interface Props {
  isEnabled: boolean;
  isDisabled: boolean;
}

export default function Modal({ isEnabled, isDisabled }: Props) {
  return (
    <Dialog>
      <Button disabled={isDisabled}>{isEnabled ? "禁用" : "启用"} Magic DNS</Button>
      <DialogPanel isDisabled={isDisabled}>
        <Title>{isEnabled ? "禁用" : "启用"} Magic DNS</Title>
        <Text>
          设备将无法再通过你的 tailnet 域名访问。搜索域名也会被禁用。
        </Text>
        <input type="hidden" name="action_id" value="toggle_magic" />
        <input type="hidden" name="new_state" value={isEnabled ? "disabled" : "enabled"} />
      </DialogPanel>
    </Dialog>
  );
}
