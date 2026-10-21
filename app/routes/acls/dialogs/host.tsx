import { useState } from "react";

import Input from "~/components/input";
import { isValidHostName } from "~/utils/acl-policy";

import EditorDialog from "./editor-dialog";

interface HostDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  name?: string;
  value?: string;
  existingNames: string[];
  onSave: (name: string, value: string) => void;
}

export default function HostDialog({
  isOpen,
  setIsOpen,
  name,
  value,
  existingNames,
  onSave,
}: HostDialogProps) {
  const [draftName, setDraftName] = useState(name ?? "");
  const [draftValue, setDraftValue] = useState(value ?? "");

  const isDuplicate = draftName !== name && existingNames.includes(draftName);
  const nameIsInvalid = !isValidHostName(draftName) || isDuplicate;
  const valueIsInvalid = draftValue.trim().length === 0;

  return (
    <EditorDialog
      description="主机为 IP 地址或 CIDR 网段命名，以便在规则中引用。"
      isDisabled={nameIsInvalid || valueIsInvalid}
      isOpen={isOpen}
      onSubmit={() => onSave(draftName, draftValue.trim())}
      setIsOpen={setIsOpen}
      submitLabel={name ? "更新主机" : "添加主机"}
      title={name ? `编辑主机 ${name}` : "新建主机"}
    >
      <Input
        errorMessage={
          isDuplicate ? "已存在同名主机。" : "主机名只能包含小写字母、数字和连字符。"
        }
        invalid={draftName.length > 0 && nameIsInvalid}
        label="名称"
        onChange={setDraftName}
        placeholder="office"
        value={draftName}
      />
      <Input
        invalid={draftValue.length > 0 && valueIsInvalid}
        label="地址"
        onChange={setDraftValue}
        placeholder="100.64.0.0/24"
        value={draftValue}
      />
    </EditorDialog>
  );
}
