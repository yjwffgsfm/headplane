import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

import Button from "~/components/button";
import CodeBlock from "~/components/code-block";
import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import Link from "~/components/link";
import NumberInput from "~/components/number-input";
import Select from "~/components/select";
import Switch from "~/components/switch";
import Text from "~/components/text";
import Title from "~/components/title";
import type { User } from "~/types";
import { getUserDisplayName } from "~/utils/user";

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
  const fetcher = useFetcher();
  const submittingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [reusable, setReusable] = useState(false);
  const [ephemeral, setEphemeral] = useState(false);
  const [tagOnly, setTagOnly] = useState(false);
  const currentUser = selfServiceOnly
    ? findCurrentUser(users, currentHeadscaleUserId, currentSubject)
    : null;
  const availableUsers = selfServiceOnly && currentUser ? [currentUser] : users;
  const [userId, setUserId] = useState<string | null>(availableUsers[0]?.id);
  const [tags, setTags] = useState("");

  const createdKey = fetcher.data?.success ? fetcher.data.key : null;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      submittingRef.current = false;
    }
  }, [fetcher.data, fetcher.state]);

  useEffect(() => {
    if (!isOpen) {
      setReusable(false);
      setEphemeral(false);
      setTagOnly(false);
      setUserId(availableUsers[0]?.id);
      setTags("");
      fetcher.data = undefined;
    }
  }, [isOpen]);

  const parsedTags = tags
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => (t.startsWith("tag:") ? t : `tag:${t}`));

  const canSubmit = tagOnly ? parsedTags.length > 0 : userId != null;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && submittingRef.current) {
          return;
        }
        setIsOpen(open);
      }}
    >
      <Button className="my-4" onClick={() => setIsOpen(true)}>
        创建预认证密钥
      </Button>
      {createdKey ? (
        <DialogPanel variant="unactionable">
          <Title>预认证密钥已创建</Title>
          <Text>请立即复制此密钥。您将无法再次查看完整密钥。</Text>
          <CodeBlock className="mt-4">{createdKey}</CodeBlock>
          <Text className="mt-4 text-sm">使用此密钥注册设备：</Text>
          <CodeBlock className="mt-1">
            {`tailscale up --login-server=${url} --authkey ${createdKey}`}
          </CodeBlock>
        </DialogPanel>
      ) : (
        <DialogPanel
          onSubmit={(event) => {
            event.preventDefault();
            submittingRef.current = true;
            const form = new FormData(event.currentTarget as HTMLFormElement);
            form.set("action_id", "add_preauthkey");
            form.set("user_id", tagOnly ? "" : (userId?.toString() ?? ""));
            form.set("reusable", reusable ? "on" : "off");
            form.set("ephemeral", ephemeral ? "on" : "off");
            form.set("acl_tags", parsedTags.join(","));
            fetcher.submit(form, { method: "POST" });
          }}
          isDisabled={fetcher.state !== "idle" || !canSubmit}
        >
          <Title>生成认证密钥</Title>

          {!selfServiceOnly && (
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <Text className="font-semibold">仅标签密钥</Text>
                <Text className="text-sm">创建由 ACL 标签拥有而非用户拥有的密钥。</Text>
              </div>
              <Switch
                defaultChecked={tagOnly}
                label="仅标签"
                onCheckedChange={() => setTagOnly(!tagOnly)}
              />
            </div>
          )}

          {!tagOnly && (
            <Select
              className="mb-2"
              description={
                selfServiceOnly ? "您只能为自己的用户创建密钥。" : "机器在认证时将归属于此用户。"
              }
              disabled={selfServiceOnly}
              required
              label="用户"
              onValueChange={(value) => setUserId(value)}
              placeholder="选择用户"
              value={userId}
              items={availableUsers.map((user) => ({
                value: user.id,
                label: getUserDisplayName(user),
              }))}
            />
          )}

          <Input
            className="mb-2"
            description="逗号分隔的标签（例如 server, prod）。tag: 前缀会自动添加。"
            required={tagOnly}
            label="ACL 标签"
            onChange={(value) => setTags(value)}
            placeholder="server, prod"
            value={tags}
          />
          <NumberInput
            defaultValue={90}
            description="设置此密钥在指定天数后过期。"
            required
            label="密钥过期时间"
            max={365_000}
            min={1}
            name="expiry"
          />
          <div className="mt-6 flex items-center justify-between gap-2">
            <div>
              <Text className="font-semibold">可重复使用</Text>
              <Text className="text-sm">允许多台设备使用此密钥进行认证。</Text>
            </div>
            <Switch
              defaultChecked={reusable}
              label="可重复使用"
              onCheckedChange={() => setReusable(!reusable)}
            />
          </div>
          <div className="mt-6 flex items-center justify-between gap-2">
            <div>
              <Text className="font-semibold">临时节点</Text>
              <Text className="text-sm">
                使用此密钥认证的设备在离线后将被自动移除。{" "}
                <Link external styled to="https://tailscale.com/kb/1111/ephemeral-nodes">
                  了解更多
                </Link>
              </Text>
            </div>
            <Switch
              defaultChecked={ephemeral}
              label="临时节点"
              onCheckedChange={() => setEphemeral(!ephemeral)}
            />
          </div>
        </DialogPanel>
      )}
    </Dialog>
  );
}
