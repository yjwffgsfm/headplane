import { Plus } from "lucide-react";
import { useState } from "react";

import ActionDialog from "~/components/action-dialog";
import Button from "~/components/button";
import Input from "~/components/input";
import Select from "~/components/select";
import { fieldValidator } from "~/utils/form";

import { recordValue } from "../schemas";

const validators = {
  A: fieldValidator(recordValue.A),
  AAAA: fieldValidator(recordValue.AAAA),
};

export default function AddRecord() {
  const [type, setType] = useState<keyof typeof validators>("A");

  return (
    <ActionDialog
      description="将域名指向 Tailnet 网络中设备的 IP 地址。"
      intent="add_record"
      submitLabel="添加记录"
      title="添加 DNS 记录"
      trigger={
        <Button>
          <Plus className="size-3.5" />
          添加记录
        </Button>
      }
    >
      <Select
        items={[
          { value: "A", label: "A" },
          { value: "AAAA", label: "AAAA" },
        ]}
        label="类型"
        name="type"
        onValueChange={(value) => {
          if (value === "A" || value === "AAAA") setType(value);
        }}
        required
        value={type}
      />
      <Input label="域名" name="name" placeholder="test.example.com" required />
      <Input
        key={type}
        label="IP 地址"
        name="value"
        placeholder={type === "AAAA" ? "2001:db8::ff00:42:8329" : "100.100.100.100"}
        required
        validate={validators[type]}
      />
    </ActionDialog>
  );
}
