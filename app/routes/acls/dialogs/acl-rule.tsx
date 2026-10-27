import { useState } from "react";

import Input from "~/components/input";
import Link from "~/components/link";
import TokenList from "~/components/token-list";
import { withDefaultPort, type AclRule } from "~/utils/acl-policy";

import EditorDialog from "./editor-dialog";

interface AclRuleDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  rule?: AclRule;
  sources: string[];
  destinations: string[];
  onSave: (rule: AclRule) => void;
}

const EMPTY: AclRule = { action: "accept", src: [], dst: [], extra: {} };

export default function AclRuleDialog({
  isOpen,
  setIsOpen,
  rule,
  sources,
  destinations,
  onSave,
}: AclRuleDialogProps) {
  const [draft, setDraft] = useState<AclRule>(() => structuredClone(rule ?? EMPTY));

  const isInvalid = draft.src.length === 0 || draft.dst.length === 0;

  return (
    <EditorDialog
      description={
        <>
          访问规则允许流量从一组来源发往一组目标。目标必须包含端口，例如{" "}
          <code className="font-mono">tag:web:80,443</code>。如果省略端口，将自动添加{" "}
          <code className="font-mono">:*</code>。完整语法请参阅{" "}
          <Link external styled to="https://tailscale.com/kb/1018/acls">
            Tailscale ACL 指南
          </Link>
          。
        </>
      }
      isDisabled={isInvalid}
      isOpen={isOpen}
      onSubmit={() => {
        // A hand-written policy may be missing the port spec Headscale wants.
        onSave({ ...draft, dst: draft.dst.map(withDefaultPort) });
      }}
      setIsOpen={setIsOpen}
      submitLabel={rule ? "更新规则" : "添加规则"}
      title={rule ? "编辑访问规则" : "新建访问规则"}
    >
      <TokenList
        description="允许发起连接的组、标签、主机、用户或自动组。"
        emptyText="暂无来源"
        label="来源"
        onChange={(src) => setDraft({ ...draft, src })}
        placeholder="group:eng"
        suggestions={sources}
        values={draft.src}
      />
      <TokenList
        description="允许流量前往的目标。未指定端口的目标会变成 :*（所有端口）。"
        emptyText="暂无目标"
        label="目标"
        normalize={withDefaultPort}
        onChange={(dst) => setDraft({ ...draft, dst })}
        placeholder="tag:web:80,443"
        suggestions={destinations}
        values={draft.dst}
      />
      <Input
        description="可选。将规则限制为单一协议（tcp、udp、icmp……）。"
        label="协议"
        onChange={(proto) => setDraft({ ...draft, proto: proto.length > 0 ? proto : undefined })}
        placeholder="tcp"
        value={draft.proto ?? ""}
      />
    </EditorDialog>
  );
}
