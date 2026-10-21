import { useState } from "react";

import ActionDialog from "~/components/action-dialog";
import Link from "~/components/link";
import RadioGroup from "~/components/radio-group";
import { Roles } from "~/server/web/roles";
import type { Role } from "~/server/web/roles";

interface ReassignProps {
  headplaneUserId: string;
  displayName: string;
  role: Role;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function ReassignUser({
  headplaneUserId,
  displayName,
  role,
  isOpen,
  setIsOpen,
}: ReassignProps) {
  const [selected, setSelected] = useState<string>(role);

  return (
    <ActionDialog
      description={
        <>
          角色决定用户在 Headplane 中能访问哪些内容。{" "}
          <Link external styled to="https://tailscale.com/kb/1138/user-roles">
            文档
          </Link>
        </>
      }
      fields={{ headplane_user_id: headplaneUserId }}
      intent="reassign"
      isDisabled={selected === role}
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="更改角色"
      title={`更改 ${displayName} 的角色`}
    >
      <RadioGroup
        className="gap-4"
        label="角色"
        name="role"
        onValueChange={setSelected}
        value={selected}
      >
        {Object.keys(Roles)
          .filter((r) => r !== "owner")
          .map((r) => {
            const { name, desc } = mapRoleToName(r);
            return (
              <RadioGroup.Radio key={r} label={name} value={r}>
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-muted">{desc}</p>
                </div>
              </RadioGroup.Radio>
            );
          })}
      </RadioGroup>
    </ActionDialog>
  );
}

function mapRoleToName(role: string) {
  switch (role) {
    case "admin":
      return {
        name: "管理员",
        desc: "可以访问管理控制台，管理网络、设备和用户设置。",
      };
    case "network_admin":
      return {
        name: "网络管理员",
        desc: "可以访问管理控制台，管理 ACL 和网络设置。无法管理设备或用户。",
      };
    case "it_admin":
      return {
        name: "IT 管理员",
        desc: "可以访问管理控制台，管理设备和用户。无法管理 ACL 或网络设置。",
      };
    case "auditor":
      return {
        name: "审计员",
        desc: "可以访问管理控制台。",
      };
    case "viewer":
      return {
        name: "查看者",
        desc: "可以查看设备和用户，并生成自己的认证密钥。",
      };
    case "member":
      return {
        name: "成员",
        desc: "无法访问管理控制台。",
      };
    default:
      return {
        name: role,
        desc: "暂无说明。",
      };
  }
}
