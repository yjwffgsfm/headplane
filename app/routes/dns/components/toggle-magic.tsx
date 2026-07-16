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
          {isEnabled
            ? "设备将无法再通过您的 Tailnet 域名访问。搜索域也将被禁用。"
            : "启用后，设备将可通过您的 Tailnet 域名访问。搜索域也将被启用。"}
        </Text>
        <input type="hidden" name="action_id" value="toggle_magic" />
        <input type="hidden" name="new_state" value={isEnabled ? "disabled" : "enabled"} />
      </DialogPanel>
    </Dialog>
  );
}
