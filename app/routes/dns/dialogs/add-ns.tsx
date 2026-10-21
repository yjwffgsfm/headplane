import { Plus } from "lucide-react";
import { useState } from "react";

import ActionDialog from "~/components/action-dialog";
import Button from "~/components/button";
import Input from "~/components/input";
import { SwitchField } from "~/components/switch";
import { fieldValidator } from "~/utils/form";

import { nameserver } from "../schemas";

const validateNameserver = fieldValidator(nameserver);

export default function AddNameserver() {
  const [isSplit, setIsSplit] = useState(false);

  return (
    <ActionDialog
      intent="add_ns"
      onOpenChange={(isOpen) => isOpen && setIsSplit(false)}
      submitLabel="添加名称服务器"
      title="添加名称服务器"
      trigger={
        <Button>
          <Plus className="size-3.5" />
          添加名称服务器
        </Button>
      }
    >
      <Input
        description="使用此 IPv4 或 IPv6 地址解析名称。"
        label="名称服务器"
        name="nameserver"
        placeholder="1.2.3.4"
        required
        validate={validateNameserver}
      />
      <SwitchField
        checked={isSplit}
        description="拆分 DNS。仅 Tailscale 1.8 及更高版本使用此名称服务器。"
        label="限制到域名"
        onCheckedChange={setIsSplit}
      />
      {isSplit && (
        <Input
          description="仅针对此域名及其子域的查询使用该名称服务器。"
          label="域名"
          name="split_domain"
          placeholder="example.com"
          required
        />
      )}
    </ActionDialog>
  );
}
