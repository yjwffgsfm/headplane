import { type } from "arktype";

import Code from "~/components/code";
import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import Text from "~/components/text";
import Title from "~/components/title";
import { useForm } from "~/hooks/use-form";
import type { Machine } from "~/types";

const renameSchema = type({
  name: "string > 0",
});

const dnsLabelPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

function validateMachineName(values: Record<string, unknown>) {
  const name = String(values.name ?? "").toLowerCase();
  if (!dnsLabelPattern.test(name)) {
    return {
      name: "请输入有效的DNS标签：仅限小写字母、数字和连字符，且必须以字母或数字开头和结尾。",
    };
  }
}

interface RenameProps {
  machine: Machine;
  isOpen: boolean;
  magic?: string;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Rename({ machine, magic, isOpen, setIsOpen }: RenameProps) {
  const form = useForm({
    schema: renameSchema,
    defaultValues: { name: machine.givenName },
    validate: validateMachineName,
  });
  const name = form.values.name as string;

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <DialogPanel isDisabled={!form.canSubmit}>
        <Title>编辑 "{machine.givenName}" 的设备名称</Title>
        <Text className="mb-6">
          该名称会显示在管理面板和Tailscale客户端中，并用于生成MagicDNS域名。
        </Text>
        <input name="action_id" type="hidden" value="rename" />
        <input name="node_id" type="hidden" value={machine.id} />
        <Input {...form.field("name")} required label="设备名称" placeholder="设备名称" />
        {magic ? (
          name.length > 0 && name !== machine.givenName ? (
            <p className="mt-2 text-sm leading-tight text-mist-600 dark:text-mist-300">
              该设备将通过主机名{" "}
              <Code className="text-sm">{name.toLowerCase().replaceAll(/\s+/g, "-")}</Code>
              {" 进行访问。"}
              主机名 <Code className="text-sm">{machine.givenName}</Code> 将不再指向该设备。
            </p>
          ) : (
            <p className="mt-2 text-sm leading-tight text-mist-600 dark:text-mist-300">
              该设备可通过主机名 <Code className="text-sm">{machine.givenName}</Code> 进行访问。
            </p>
          )
        ) : undefined}
      </DialogPanel>
    </Dialog>
  );
}