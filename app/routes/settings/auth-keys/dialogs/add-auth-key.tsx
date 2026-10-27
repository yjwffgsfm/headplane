import { Plus } from "lucide-react";
import { useState } from "react";

import ActionDialog from "~/components/action-dialog";
import Button from "~/components/button";
import Callout from "~/components/callout";
import CodeBlock from "~/components/code-block";
import { DialogDescription, DialogTitle } from "~/components/dialog";
import Link from "~/components/link";
import NumberInput from "~/components/number-input";
import Select from "~/components/select";
import { SwitchField } from "~/components/switch";
import TokenList from "~/components/token-list";
import type { User } from "~/types";
import { getUserDisplayName, sortUsersByDisplayName } from "~/utils/user";

interface AddAuthKeyProps {
  users: User[];
  url: string;
  selfServiceOnly: boolean;
  currentHeadscaleUserId?: string;
  currentSubject?: string;
}

function findCurrentUser(
  users: User[],
  headscaleUserId: string | undefined,
  subject: string | undefined,
): User | undefined {
  if (headscaleUserId) {
    const linked = users.find((u) => u.id === headscaleUserId);
    if (linked) {
      return linked;
    }
  }

  if (!subject) {
    return undefined;
  }
  return users.find((u) => {
    if (u.provider !== "oidc" || !u.providerId) {
      return false;
    }
    const segment = u.providerId.split("/").pop();
    return segment ? decodeURIComponent(segment) === subject : false;
  });
}

export default function AddAuthKey({
  users,
  url,
  selfServiceOnly,
  currentHeadscaleUserId,
  currentSubject,
}: AddAuthKeyProps) {
  const currentUser = selfServiceOnly
    ? findCurrentUser(users, currentHeadscaleUserId, currentSubject)
    : undefined;

  return (
    <ActionDialog
      description="设备使用该密钥登录，无需交互式登录。"
      intent="create"
      isDisabled={selfServiceOnly && !currentUser}
      submitLabel="创建密钥"
      success={({ key }) => (
        <>
          <DialogTitle>认证密钥已创建</DialogTitle>
          <DialogDescription>请立即复制该密钥，它不会再次显示。</DialogDescription>
          <CodeBlock>{key}</CodeBlock>
          <p className="text-muted">使用它注册设备：</p>
          <CodeBlock>{`tailscale up --login-server=${url} --authkey ${key}`}</CodeBlock>
        </>
      )}
      title="创建认证密钥"
      trigger={
        <Button variant="primary">
          <Plus className="size-3.5" />
          创建密钥
        </Button>
      }
    >
      <AuthKeyFields currentUser={currentUser} selfServiceOnly={selfServiceOnly} users={users} />
    </ActionDialog>
  );
}

interface AuthKeyFieldsProps {
  users: User[];
  selfServiceOnly: boolean;
  currentUser?: User;
}

// Kept separate so its state resets each time the dialog opens.
function AuthKeyFields({ users, selfServiceOnly, currentUser }: AuthKeyFieldsProps) {
  const [isTagOnly, setIsTagOnly] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  if (selfServiceOnly && !currentUser) {
    return (
      <Callout variant="warning">
        你的账户尚未关联 Headscale 用户，因此无法创建密钥。
      </Callout>
    );
  }

  return (
    <>
      {!selfServiceOnly && (
        <SwitchField
          checked={isTagOnly}
          description="密钥归属于其标签，而不是某个用户。"
          label="仅标签密钥"
          onCheckedChange={setIsTagOnly}
        />
      )}
      {!isTagOnly &&
        (currentUser ? (
          <>
            <input name="user_id" type="hidden" value={currentUser.id} />
            <Select
              description="只能为自己的用户创建密钥。"
              disabled
              items={[{ value: currentUser.id, label: getUserDisplayName(currentUser) }]}
              label="用户"
              value={currentUser.id}
            />
          </>
        ) : (
          <Select
            defaultValue={sortUsersByDisplayName(users)[0]?.id ?? null}
            description="使用该密钥登录的设备将归属于此用户。"
            items={sortUsersByDisplayName(users).map((user) => ({
              value: user.id,
              label: getUserDisplayName(user),
            }))}
            label="用户"
            name="user_id"
            placeholder="选择用户"
            required
          />
        ))}
      {tags.map((tag) => (
        <input key={tag} name="tags" type="hidden" value={tag} />
      ))}
      <TokenList
        emptyText={isTagOnly ? "至少添加一个标签" : "无标签"}
        label="标签"
        normalize={(value) => (value.startsWith("tag:") ? value : `tag:${value}`)}
        onChange={setTags}
        placeholder="tag:server"
        validate={(value) => /^tag:\S+$/.test(value)}
        values={tags}
      />
      <NumberInput
        defaultValue={90}
        label="过期时间（天）"
        max={365_000}
        min={1}
        name="expiry"
        required
      />
      <SwitchField
        description="该密钥可用于登录多台设备。"
        label="可重复使用"
        name="reusable"
      />
      <SwitchField
        description={
          <>
            设备离线后将被移除。<Link external styled to="https://tailscale.com/kb/1111/ephemeral-nodes">
              文档
            </Link>
          </>
        }
        label="临时"
        name="ephemeral"
      />
    </>
  );
}
