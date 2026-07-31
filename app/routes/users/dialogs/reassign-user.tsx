import Dialog, { DialogPanel } from "~/components/dialog";
import Link from "~/components/link";
import Notice from "~/components/notice";
import RadioGroup from "~/components/radio-group";
import Text from "~/components/text";
import Title from "~/components/title";
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
  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <DialogPanel variant={role === "owner" ? "unactionable" : "normal"}>
        <Title>更改 {displayName} 的角色？</Title>
        <Text className="mb-6">
          角色控制用户在 Headplane 中可以访问的内容。每个角色授予一组特定的能力。{" "}
          <Link external styled to="https://tailscale.com/kb/1138/user-roles">
            了解更多
          </Link>
        </Text>
        {role === "owner" ? (
          <Notice>Tailnet 所有者不能被重新分配。</Notice>
        ) : (
          <>
            <input name="action_id" type="hidden" value="reassign_user" />
            <input name="headplane_user_id" type="hidden" value={headplaneUserId} />
            <RadioGroup className="gap-4" defaultValue={role} label="角色" name="new_role">
              {Object.keys(Roles)
                .filter((r) => r !== "owner")
                .map((r) => {
                  const { name, desc } = mapRoleToName(r);
                  return (
                    <RadioGroup.Radio key={r} label={name} value={r}>
                      <div className="block">
                        <p className="font-bold">{name}</p>
                        <p className="opacity-70">{desc}</p>
                      </div>
                    </RadioGroup.Radio>
                  );
                })}
            </RadioGroup>
          </>
        )}
      </DialogPanel>
    </Dialog>
  );
}

function mapRoleToName(role: string) {
  switch (role) {
    case "admin":
      return {
        name: "管理员",
        desc: "可以查看管理控制台，管理网络、机器和用户设置。",
      };
    case "network_admin":
      return {
        name: "网络管理员",
        desc: "可以查看管理控制台并管理 ACL 和网络设置。不能管理机器或用户。",
      };
    case "it_admin":
      return {
        name: "IT 管理员",
        desc: "可以查看管理控制台并管理机器和用户。不能管理 ACL 或网络设置。",
      };
    case "auditor":
      return {
        name: "审计员",
        desc: "可以查看管理控制台。",
      };
    case "viewer":
      return {
        name: "查看者",
        desc: "可以查看机器、用户，并生成自己的认证密钥。",
      };
    case "member":
      return {
        name: "成员",
        desc: "无法查看管理控制台。",
      };
    default:
      return {
        name: role,
        desc: "无可用描述。",
      };
  }
}
