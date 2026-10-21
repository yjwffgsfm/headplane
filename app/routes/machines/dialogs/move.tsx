import { useState } from "react";

import ActionDialog from "~/components/action-dialog";
import Select from "~/components/select";
import type { Machine, User } from "~/types";
import { getUserDisplayName, sortUsersByDisplayName } from "~/utils/user";

interface MoveProps {
  machine: Machine;
  users: User[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Move({ machine, users, isOpen, setIsOpen }: MoveProps) {
  const [userId, setUserId] = useState(machine.user?.id ?? null);

  return (
    <ActionDialog
      description="所有者是此设备所属的用户。"
      fields={{ node_id: machine.id }}
      intent="reassign"
      isDisabled={!userId || userId === machine.user?.id}
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="更改所有者"
      title={`更改 ${machine.givenName} 的所有者`}
    >
      <Select
        defaultValue={machine.user?.id ?? null}
        items={sortUsersByDisplayName(users).map((user) => ({
          value: user.id,
          label: getUserDisplayName(user),
        }))}
        label="所有者"
        name="user_id"
        onValueChange={setUserId}
        placeholder="选择用户"
        required
      />
    </ActionDialog>
  );
}
