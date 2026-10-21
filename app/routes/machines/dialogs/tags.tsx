import { useState } from "react";

import ActionDialog from "~/components/action-dialog";
import Callout from "~/components/callout";
import Code from "~/components/code";
import Link from "~/components/link";
import TokenList from "~/components/token-list";
import type { Machine } from "~/types";

interface TagsProps {
  machine: Machine;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  existingTags?: string[];
  // Tags declared under `tagOwners`. Others are assignable but match no rule.
  policyTags?: string[];
}

export default function Tags({ machine, isOpen, setIsOpen, existingTags, policyTags }: TagsProps) {
  const [tags, setTags] = useState([...machine.tags]);
  const undeclaredTags =
    policyTags === undefined ? [] : tags.filter((tag) => !policyTags.includes(tag));
  const isUnchanged =
    tags.length === machine.tags.length && tags.every((tag) => machine.tags.includes(tag));

  return (
    <ActionDialog
      description={
        <>
          标签让访问控制策略可以按角色引用设备。
          <Link external styled to="https://tailscale.com/kb/1068/acl-tags">
            文档
          </Link>
        </>
      }
      fields={{ node_id: machine.id }}
      intent="update_tags"
      isDisabled={isUnchanged}
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="保存标签"
      title={`${machine.givenName} 的标签`}
    >
      {tags.map((tag) => (
        <input key={tag} name="tags" type="hidden" value={tag} />
      ))}
      <TokenList
        emptyText="此设备没有标签"
        label="标签"
        normalize={(value) => (value.startsWith("tag:") ? value : `tag:${value}`)}
        onChange={setTags}
        placeholder="tag:server"
        suggestions={existingTags}
        validate={(value) => /^tag:\S+$/.test(value)}
        values={tags}
      />
      {undeclaredTags.length > 0 && (
        <Callout variant="warning">
          {undeclaredTags.join(", ")} 未在 <Code>tagOwners</Code> 中声明，因此没有规则会匹配。请在
          <Link styled to="/acls">访问控制</Link>
          中声明。
        </Callout>
      )}
    </ActionDialog>
  );
}
