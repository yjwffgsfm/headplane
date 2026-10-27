import { useState } from "react";

import Input from "~/components/input";
import Link from "~/components/link";
import Select from "~/components/select";
import TokenList from "~/components/token-list";
import { KNOWN_SSH_ACTIONS, type SshRule } from "~/utils/acl-policy";

import EditorDialog from "./editor-dialog";

interface SshRuleDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  rule?: SshRule;
  sources: string[];
  destinations: string[];
  onSave: (rule: SshRule) => void;
}

const EMPTY: SshRule = { action: "accept", src: [], dst: [], users: [], extra: {} };
const SSH_USERS = ["root", "autogroup:nonroot"];

export default function SshRuleDialog({
  isOpen,
  setIsOpen,
  rule,
  sources,
  destinations,
  onSave,
}: SshRuleDialogProps) {
  const [draft, setDraft] = useState<SshRule>(() => structuredClone(rule ?? EMPTY));

  const isInvalid = draft.src.length === 0 || draft.dst.length === 0 || draft.users.length === 0;

  return (
    <EditorDialog
      description={
        <>
          SSH 规则控制节点之间的 Tailscale SSH 访问。有关检查模式的详情，请阅读{" "}
          <Link external styled to="https://tailscale.com/kb/1193/tailscale-ssh">
            Tailscale SSH 文档
          </Link>
          。
        </>
      }
      isDisabled={isInvalid}
      isOpen={isOpen}
      onSubmit={() => onSave(draft)}
      setIsOpen={setIsOpen}
      submitLabel={rule ? "更新规则" : "添加规则"}
      title={rule ? "编辑 SSH 规则" : "新建 SSH 规则"}
    >
      <Select
        items={[
          { value: "accept", label: "接受 — 立即允许会话" },
          { value: "check", label: "检查 — 需要定期重新认证" },
          // An action we do not know is listed as-is so it survives an edit.
          ...(KNOWN_SSH_ACTIONS.includes(draft.action)
            ? []
            : [{ value: draft.action, label: `${draft.action} — Headplane 无法识别` }]),
        ]}
        label="操作"
        onValueChange={(value) => setDraft({ ...draft, action: value ?? draft.action })}
        value={draft.action}
      />
      <TokenList
        description="谁可以发起 SSH 会话。"
        emptyText="暂无来源"
        label="来源"
        onChange={(src) => setDraft({ ...draft, src })}
        placeholder="group:ops"
        suggestions={sources}
        values={draft.src}
      />
      <TokenList
        description="接受 SSH 会话的节点。"
        emptyText="暂无目标"
        label="目标"
        onChange={(dst) => setDraft({ ...draft, dst })}
        placeholder="tag:server"
        suggestions={destinations}
        values={draft.dst}
      />
      <TokenList
        description="允许登录的本地 Unix 用户。"
        emptyText="暂无 SSH 用户"
        label="SSH 用户"
        onChange={(users) => setDraft({ ...draft, users })}
        placeholder="autogroup:nonroot"
        suggestions={SSH_USERS}
        values={draft.users}
      />
      {draft.action === "check" ? (
        <Input
          description="检查模式会话的有效时长，例如 12h。"
          label="检查周期"
          onChange={(checkPeriod) =>
            setDraft({ ...draft, checkPeriod: checkPeriod.length > 0 ? checkPeriod : undefined })
          }
          placeholder="12h"
          value={draft.checkPeriod ?? ""}
        />
      ) : null}
    </EditorDialog>
  );
}
