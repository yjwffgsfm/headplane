import { Plus } from "lucide-react";

import ActionDialog from "~/components/action-dialog";
import Button from "~/components/button";
import Input from "~/components/input";

export default function AddDomain() {
  return (
    <ActionDialog
      description="解析短名称时，设备会尝试此后缀。"
      intent="add_domain"
      submitLabel="添加域名"
      title="添加搜索域"
      trigger={
        <Button>
          <Plus className="size-3.5" />
          添加域名
        </Button>
      }
    >
      <Input label="域名" name="domain" placeholder="corp.example.com" required />
    </ActionDialog>
  );
}
