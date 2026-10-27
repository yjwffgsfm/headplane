import { ArrowRight, Terminal } from "lucide-react";
import { useState } from "react";

import Chip from "~/components/chip";
import List from "~/components/list";
import type { AclRule, Policy, SshRule } from "~/utils/acl-policy";

import AclRuleDialog from "../dialogs/acl-rule";
import HostDialog from "../dialogs/host";
import SshRuleDialog from "../dialogs/ssh-rule";
import { Empty, RowActions, Section } from "./editor-section";

interface RulesEditorProps {
  policy: Policy;
  onChange: (policy: Policy) => void;
  isDisabled: boolean;
  sources: string[];
  destinations: string[];
}

type Editing =
  | { kind: "acl"; index: number | null }
  | { kind: "ssh"; index: number | null }
  | { kind: "host"; name: string | null }
  | null;

export default function RulesEditor({
  policy,
  onChange,
  isDisabled,
  sources,
  destinations,
}: RulesEditorProps) {
  const [editing, setEditing] = useState<Editing>(null);

  const aclRule =
    editing?.kind === "acl" && editing.index !== null ? policy.acls[editing.index] : undefined;
  const sshRule =
    editing?.kind === "ssh" && editing.index !== null ? policy.ssh[editing.index] : undefined;
  const hostName = editing?.kind === "host" ? editing.name : null;

  function saveAcl(rule: AclRule) {
    const acls = [...policy.acls];
    if (editing?.kind === "acl" && editing.index !== null) {
      acls[editing.index] = rule;
    } else {
      acls.push(rule);
    }
    onChange({ ...policy, acls });
  }

  function saveSsh(rule: SshRule) {
    const ssh = [...policy.ssh];
    if (editing?.kind === "ssh" && editing.index !== null) {
      ssh[editing.index] = rule;
    } else {
      ssh.push(rule);
    }
    onChange({ ...policy, ssh });
  }

  function saveHost(name: string, value: string) {
    const hosts = { ...policy.hosts };
    if (hostName !== null && hostName !== name) {
      delete hosts[hostName];
    }
    hosts[name] = value;
    onChange({ ...policy, hosts });
  }

  const hostEntries = Object.entries(policy.hosts).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-8">
      {editing?.kind === "acl" ? (
        <AclRuleDialog
          destinations={destinations}
          isOpen
          onSave={saveAcl}
          rule={aclRule}
          setIsOpen={(open) => {
            if (!open) setEditing(null);
          }}
          sources={sources}
        />
      ) : null}
      {editing?.kind === "ssh" ? (
        <SshRuleDialog
          destinations={destinations}
          isOpen
          onSave={saveSsh}
          rule={sshRule}
          setIsOpen={(open) => {
            if (!open) setEditing(null);
          }}
          sources={sources}
        />
      ) : null}
      {editing?.kind === "host" ? (
        <HostDialog
          existingNames={Object.keys(policy.hosts)}
          isOpen
          name={hostName ?? undefined}
          onSave={saveHost}
          setIsOpen={(open) => {
            if (!open) setEditing(null);
          }}
          value={hostName ? policy.hosts[hostName] : undefined}
        />
      ) : null}

      <Section
        description="规则自上而下依次评估。除非有规则允许，否则流量会被拒绝。"
        isDisabled={isDisabled}
        onAdd={() => setEditing({ kind: "acl", index: null })}
        title="访问规则"
      >
        {policy.acls.length === 0 ? (
          <Empty text="尚未定义访问规则。" />
        ) : (
          policy.acls.map((rule, index) => (
            <List.Item
              className="flex-col items-stretch gap-2 py-3 md:flex-row md:items-center"
              key={`acl-${index}`}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {/* An unknown action is shown verbatim, never relabelled. */}
                <span className="text-xs font-semibold uppercase opacity-60">
                  {rule.action === "accept" ? "允许" : rule.action}
                </span>
                <ChipRow values={rule.src} />
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
                <ChipRow values={rule.dst} />
                {rule.proto ? <Chip className="uppercase" text={rule.proto} /> : null}
              </div>
              <RowActions
                isDisabled={isDisabled}
                onDelete={() =>
                  onChange({ ...policy, acls: policy.acls.filter((_, i) => i !== index) })
                }
                onEdit={() => setEditing({ kind: "acl", index })}
              />
            </List.Item>
          ))
        )}
      </Section>

      <Section
        description="控制哪些节点可以通过 Tailscale SSH 访问，以及以哪个本地用户身份访问。"
        isDisabled={isDisabled}
        onAdd={() => setEditing({ kind: "ssh", index: null })}
        title="SSH 规则"
      >
        {policy.ssh.length === 0 ? (
          <Empty text="尚未定义 SSH 规则。" />
        ) : (
          policy.ssh.map((rule, index) => (
            <List.Item
              className="flex-col items-stretch gap-2 py-3 md:flex-row md:items-center"
              key={`ssh-${index}`}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Terminal className="h-4 w-4 shrink-0 opacity-60" />
                <span className="text-xs font-semibold uppercase opacity-60">{rule.action}</span>
                <ChipRow values={rule.src} />
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
                <ChipRow values={rule.dst} />
                <span className="text-xs opacity-60">作为</span>
                <ChipRow values={rule.users} />
              </div>
              <RowActions
                isDisabled={isDisabled}
                onDelete={() =>
                  onChange({ ...policy, ssh: policy.ssh.filter((_, i) => i !== index) })
                }
                onEdit={() => setEditing({ kind: "ssh", index })}
              />
            </List.Item>
          ))
        )}
      </Section>

      <Section
        description="可在规则中引用的命名 IP 地址和 CIDR 范围。"
        isDisabled={isDisabled}
        onAdd={() => setEditing({ kind: "host", name: null })}
        title="主机"
      >
        {hostEntries.length === 0 ? (
          <Empty text="尚未定义主机。" />
        ) : (
          hostEntries.map(([name, value]) => (
            <List.Item key={name}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-sm">{name}</span>
                <span className="font-mono text-sm opacity-60">{value}</span>
              </div>
              <RowActions
                isDisabled={isDisabled}
                onDelete={() => {
                  const hosts = { ...policy.hosts };
                  delete hosts[name];
                  onChange({ ...policy, hosts });
                }}
                onEdit={() => setEditing({ kind: "host", name })}
              />
            </List.Item>
          ))
        )}
      </Section>
    </div>
  );
}

function ChipRow({ values }: { values: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {values.map((value) => (
        <Chip className="font-mono" key={value} text={value} />
      ))}
    </span>
  );
}
