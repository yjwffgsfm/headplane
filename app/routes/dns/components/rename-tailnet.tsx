import ActionDialog from "~/components/action-dialog";
import Button from "~/components/button";
import Input from "~/components/input";

interface Props {
  name: string;
  isDisabled: boolean;
}

export default function RenameTailnet({ name, isDisabled }: Props) {
  return (
    <ActionDialog
      description="在新名称生效前，设备可能出现异常。"
      intent="rename_tailnet"
      submitLabel="重命名"
      title="重命名 Tailnet"
      trigger={
        <Button disabled={isDisabled} size="sm">
          重命名
        </Button>
      }
    >
      <Input defaultValue={name} label="Tailnet 名称" name="name" placeholder="ts.net" required />
    </ActionDialog>
  );
}
