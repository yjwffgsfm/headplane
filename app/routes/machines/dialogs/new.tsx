import { type } from "arktype";
import { Computer, FileKey2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import CodeBlock from "~/components/code-block";
import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "~/components/menu";
import Select from "~/components/select";
import Text from "~/components/text";
import Title from "~/components/title";
import { useForm } from "~/hooks/use-form";
import type { User } from "~/types";
import { normalizeRegistrationKey } from "~/utils/register-key";
import { getUserDisplayName } from "~/utils/user";

const registerSchema = type({
  register_key: "string > 0",
  user: "string > 0",
});

export interface NewMachineProps {
  server: string;
  users: User[];
  isDisabled?: boolean;
  disabledKeys?: string[];
}

export default function NewMachine(data: NewMachineProps) {
  const [pushDialog, setPushDialog] = useState(false);
  const form = useForm({
    schema: registerSchema,
    validate: (values) =>
      normalizeRegistrationKey(String(values.register_key ?? ""))
        ? undefined
        : {
            register_key:
              "请粘贴 tailscale up 显示的注册地址或完整的 hskey-authreq-... 密钥。",
          },
  });
  const navigate = useNavigate();

  return (
    <>
      <Dialog isOpen={pushDialog} onOpenChange={setPushDialog}>
        <DialogPanel isDisabled={!form.canSubmit}>
          <Title>注册机器密钥</Title>
          <Text>当你在设备上运行以下命令时，会得到机器密钥：</Text>
          <CodeBlock className="mb-4">{`tailscale up --login-server=${data.server}`}</CodeBlock>
          <input name="action_id" type="hidden" value="register" />
          <Input
            {...form.field("register_key")}
            required
            label="机器密钥"
            placeholder="hskey-authreq-XXXXXXXXXXXXXXXXXXXXXXXX"
            description="请粘贴 tailscale up 显示的注册地址或完整密钥。"
          />
          <Select
            required
            label="所有者"
            name="user"
            onValueChange={(v) => form.setValue("user", v)}
            placeholder="选择一个用户"
            items={data.users.map((user) => ({
              // Headscale's v1/node/register endpoint resolves the owner by
              // username via GetUserByName, so we must pass user.name (not id).
              value: user.name,
              label: getUserDisplayName(user),
            }))}
          />
        </DialogPanel>
      </Dialog>
      <Menu disabled={data.isDisabled}>
        <MenuTrigger className="rounded-md bg-indigo-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500/90 dark:bg-indigo-500/90 dark:hover:bg-indigo-500/80">
          添加设备
        </MenuTrigger>
        <MenuContent>
          <MenuItem
            disabled={data.disabledKeys?.includes("register")}
            onClick={() => setPushDialog(true)}
          >
            <div className="flex items-center gap-x-3">
              <Computer className="w-4" />
              注册机器密钥
            </div>
          </MenuItem>
          <MenuItem
            disabled={data.disabledKeys?.includes("pre-auth")}
            onClick={() => navigate("/settings/auth-keys")}
          >
            <div className="flex items-center gap-x-3">
              <FileKey2 className="w-4" />
              生成预认证密钥
            </div>
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}
