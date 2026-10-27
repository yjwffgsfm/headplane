import { Computer, FileKey2, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import ActionDialog from "~/components/action-dialog";
import CodeBlock from "~/components/code-block";
import Input from "~/components/input";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "~/components/menu";
import Select from "~/components/select";
import type { User } from "~/types";
import { normalizeRegistrationKey } from "~/utils/register-key";
import { getUserDisplayName, sortUsersByDisplayName } from "~/utils/user";

export interface NewMachineProps {
  server: string;
  users: User[];
  isDisabled?: boolean;
  disabledKeys?: string[];
}

export default function NewMachine(data: NewMachineProps) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <ActionDialog
        description="在设备上运行下面的命令，然后粘贴它输出的密钥。"
        intent="register"
        onOpenChange={setIsRegisterOpen}
        open={isRegisterOpen}
        submitLabel="注册"
        title="注册设备"
      >
        <CodeBlock>{`tailscale up --login-server=${data.server}`}</CodeBlock>
        <Input
          description="注册 URL，或完整的 hskey-authreq-... 密钥。"
          label="设备密钥"
          name="register_key"
          placeholder="hskey-authreq-XXXXXXXXXXXXXXXXXXXXXXXX"
          required
          validate={(value) =>
            normalizeRegistrationKey(String(value ?? ""))
              ? null
              : "请粘贴注册 URL 或完整的 hskey-authreq-... 密钥。"
          }
        />
        <Select
          items={sortUsersByDisplayName(data.users).map((user) => ({
            // Headscale's v1/node/register endpoint resolves the owner by
            // username via GetUserByName, so we must pass user.name (not id).
            value: user.name,
            label: getUserDisplayName(user),
          }))}
          label="所有者"
          name="user"
          placeholder="选择用户"
          required
        />
      </ActionDialog>
      <Menu disabled={data.isDisabled}>
        <MenuTrigger className="bg-ink text-ink-fg hover:bg-ink/90 h-8 gap-1.5 rounded-md px-3 text-sm font-medium">
          <Plus className="size-3.5" />
          添加设备
        </MenuTrigger>
        <MenuContent>
          <MenuItem
            disabled={data.disabledKeys?.includes("register")}
            onClick={() => setIsRegisterOpen(true)}
          >
            <div className="flex items-center gap-x-3">
              <Computer className="w-4" />
              注册设备密钥
            </div>
          </MenuItem>
          <MenuItem
            disabled={data.disabledKeys?.includes("pre-auth")}
            onClick={() => navigate("/settings/auth-keys")}
          >
            <div className="flex items-center gap-x-3">
              <FileKey2 className="w-4" />
              创建认证密钥
            </div>
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}
