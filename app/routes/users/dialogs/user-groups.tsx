import { useState } from "react";

import ActionDialog from "~/components/action-dialog";
import Callout from "~/components/callout";
import Code from "~/components/code";
import Link from "~/components/link";
import TokenList from "~/components/token-list";
import { isValidGroupName } from "~/utils/acl-policy";

interface UserGroupsProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  // The Headscale username, which is what the ACL policy references.
  userName: string;
  displayName: string;
  groups: string[];
  availableGroups: string[];
  // Whether the stored policy contains HuJSON comments, which saving drops.
  policyHasComments?: boolean;
}

export default function UserGroups({
  isOpen,
  setIsOpen,
  userName,
  displayName,
  groups,
  availableGroups,
  policyHasComments,
}: UserGroupsProps) {
  const [selected, setSelected] = useState([...groups]);
  const isUnchanged =
    selected.length === groups.length && selected.every((group) => groups.includes(group));

  return (
    <ActionDialog
      description={
        <>
          组保存在 ACL 策略中，因此保存会重写策略里的 <Code>groups</Code> 部分。{" "}
          <Link external styled to="https://tailscale.com/kb/1018/acls">
            文档
          </Link>
        </>
      }
      fields={{ user_name: userName }}
      intent="update_groups"
      isDisabled={isUnchanged}
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="保存组"
      title={`${displayName} 的组`}
    >
      {selected.map((group) => (
        <input key={group} name="groups" type="hidden" value={group} />
      ))}
      <TokenList
        emptyText="该用户未加入任何组"
        label="组"
        onChange={setSelected}
        placeholder="group:example"
        suggestions={availableGroups}
        validate={isValidGroupName}
        values={selected}
      />
      {policyHasComments && (
        <Callout variant="warning">
          你的策略中包含注释。在此保存会重写策略并丢失这些注释。
        </Callout>
      )}
    </ActionDialog>
  );
}
