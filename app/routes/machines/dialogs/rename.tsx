import { useState } from "react";

import ActionDialog from "~/components/action-dialog";
import Code from "~/components/code";
import Input from "~/components/input";
import type { Machine } from "~/types";
import { fieldValidator } from "~/utils/form";

import { machineName } from "../schemas";

interface RenameProps {
  machine: Machine;
  isOpen: boolean;
  magic?: string;
  setIsOpen: (isOpen: boolean) => void;
}

const validateName = fieldValidator(machineName);

export default function Rename({ machine, magic, isOpen, setIsOpen }: RenameProps) {
  const [name, setName] = useState(machine.givenName);
  const isValid = validateName(name) === null;

  return (
    <ActionDialog
      description="此名称会显示在管理面板和 Tailscale 客户端中，并用于生成 MagicDNS 名称。"
      fields={{ node_id: machine.id }}
      intent="rename"
      isDisabled={name === machine.givenName}
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="重命名"
      title={`重命名 ${machine.givenName}`}
    >
      <Input
        defaultValue={machine.givenName}
        label="设备名称"
        name="name"
        onChange={setName}
        required
        validate={validateName}
      />
      {magic && isValid && (
        <p className="text-muted">
          {name === machine.givenName ? (
            <>
              可通过 <Code>{machine.givenName}</Code> 访问。
            </>
          ) : (
            <>
              将可通过 <Code>{name.toLowerCase()}</Code> 访问，{" "}
              <Code>{machine.givenName}</Code> 将不再解析。
            </>
          )}
        </p>
      )}
    </ActionDialog>
  );
}
