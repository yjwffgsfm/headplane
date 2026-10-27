import { Plus } from "lucide-react";
import { useState } from "react";

import ActionDialog from "~/components/action-dialog";
import Button from "~/components/button";
import Input from "~/components/input";
import { fieldValidator } from "~/utils/form";

import { type RestrictionType, restrictionValue } from "../schemas";

const copy = {
  domain: {
    title: "添加域名",
    label: "域名",
    description: "只有邮箱地址属于此域名的用户才能通过 OIDC 登录。",
    placeholder: "example.com",
  },
  group: {
    title: "添加组",
    label: "组",
    description: "只有此 OIDC 组的成员才能登录。",
    placeholder: "admin",
  },
  user: {
    title: "添加用户",
    label: "用户",
    description: "只有此 OIDC 用户才能登录。",
    placeholder: "john_doe",
  },
};

const validators = {
  domain: fieldValidator(restrictionValue.domain),
  group: fieldValidator(restrictionValue.group),
  user: fieldValidator(restrictionValue.user),
};

interface AddRestrictionProps {
  type: RestrictionType;
}

export default function AddRestriction({ type }: AddRestrictionProps) {
  const [value, setValue] = useState("");
  const { title, label, description, placeholder } = copy[type];
  const domain = value.trim();

  return (
    <ActionDialog
      description={description}
      fields={{ type }}
      intent="add"
      submitLabel={title}
      title={title}
      trigger={
        <Button>
          <Plus className="size-3.5" />
          {title}
        </Button>
      }
    >
      <Input
        description={
          type === "domain" && domain.length > 0 ? `匹配 <user>@${domain}` : undefined
        }
        label={label}
        name="value"
        onChange={setValue}
        placeholder={placeholder}
        required
        validate={validators[type]}
      />
    </ActionDialog>
  );
}
