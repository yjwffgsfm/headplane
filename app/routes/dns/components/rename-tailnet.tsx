import Button from "~/components/button";
import Code from "~/components/code";
import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import Text from "~/components/text";
import Title from "~/components/title";

interface Props {
  name: string;
  isDisabled: boolean;
}

export default function RenameTailnet({ name, isDisabled }: Props) {
  return (
    <div className="flex w-full flex-col gap-y-4 sm:w-2/3">
      <h1 className="mb-2 text-2xl font-medium">Tailnet 名称</h1>
      <p>
        这是您的 Tailnet 的基础域名。启用 Magic DNS 后，设备可通过 <Code>[设备名].{name}</Code>{" "}
        进行访问。
      </p>
      <Input
        className="w-3/5 text-sm font-medium"
        readOnly
        label="Tailnet 名称"
        labelHidden
        onFocus={(event) => {
          (event.target as HTMLInputElement).select();
        }}
        value={name}
      />
      <Dialog>
        <Button disabled={isDisabled}>重命名 Tailnet</Button>
        <DialogPanel isDisabled={isDisabled}>
          <Title>重命名 Tailnet</Title>
          <Text className="mb-8">
            请注意，更改此设置可能会导致各种意外行为，并可能破坏 Tailnet 中的现有设备。
          </Text>
          <input name="action_id" type="hidden" value="rename_tailnet" />
          <Input
            defaultValue={name}
            required
            label="Tailnet 名称"
            name="new_name"
            placeholder="ts.net"
          />
        </DialogPanel>
      </Dialog>
    </div>
  );
}
