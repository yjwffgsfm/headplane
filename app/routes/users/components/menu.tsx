import { Ellipsis } from "lucide-react";
import { useState } from "react";

import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "~/components/menu";

import Delete from "../dialogs/delete-user";
import LinkUser from "../dialogs/link-user";
import Reassign from "../dialogs/reassign-user";
import TransferOwnership from "../dialogs/transfer-ownership";
import type { HeadplaneUserData } from "../overview";

interface MenuProps {
  user: HeadplaneUserData;
  headscaleUsers: { id: string; name: string; claimed: boolean }[];
  currentLink?: string;
  isSelf?: boolean;
  isOwner?: boolean;
}

type Modal = "delete" | "reassign" | "link" | "transfer" | null;

export default function UserMenu({
  user,
  headscaleUsers,
  currentLink,
  isSelf,
  isOwner,
}: MenuProps) {
  const [modal, setModal] = useState<Modal>(null);

  const isLinked = currentLink !== undefined;
  const disabledKeys: string[] = [];
  if (!isLinked) {
    disabledKeys.push("reassign");
  }

  // Filter linkable users: unclaimed, or the one currently linked to this user
  const linkableUsers = headscaleUsers.filter((u) => !u.claimed || u.id === currentLink);

  const displayName = user.linkedHeadscaleUser?.displayName || user.name || user.email || user.sub;

  return (
    <>
      {modal === "delete" && user.linkedHeadscaleUser && (
        <Delete
          isOpen={modal === "delete"}
          machines={user.machines}
          setIsOpen={(isOpen) => {
            if (!isOpen) setModal(null);
          }}
          user={user.linkedHeadscaleUser}
        />
      )}
      {modal === "reassign" && (
        <Reassign
          displayName={displayName}
          headplaneUserId={user.id}
          isOpen={modal === "reassign"}
          role={user.role}
          setIsOpen={(isOpen) => {
            if (!isOpen) setModal(null);
          }}
        />
      )}
      {modal === "link" && (
        <LinkUser
          currentLink={currentLink}
          displayName={displayName}
          headplaneUserId={user.id}
          headscaleUsers={linkableUsers}
          isOpen={modal === "link"}
          setIsOpen={(isOpen) => {
            if (!isOpen) setModal(null);
          }}
        />
      )}
      {modal === "transfer" && (
        <TransferOwnership
          isOpen={modal === "transfer"}
          setIsOpen={(isOpen) => {
            if (!isOpen) setModal(null);
          }}
          targetDisplayName={displayName}
          targetHeadplaneUserId={user.id}
        />
      )}

      <Menu>
        <MenuTrigger className="w-10 rounded-full bg-transparent p-1 py-0.5 hover:bg-mist-100 dark:hover:bg-mist-800">
          <Ellipsis className="h-5" />
        </MenuTrigger>
        <MenuContent>
          <MenuItem
            disabled={disabledKeys.includes("reassign")}
            onClick={() => setModal("reassign")}
          >
            更改角色
          </MenuItem>
          <MenuItem onClick={() => setModal("link")}>
            {isLinked ? "更改关联用户" : "关联 Headscale 用户"}
          </MenuItem>
          {isOwner && !isSelf && (
            <>
              <MenuSeparator />
              <MenuItem variant="danger" onClick={() => setModal("transfer")}>
                转移所有权
              </MenuItem>
            </>
          )}
          {user.linkedHeadscaleUser && !isSelf && (
            <>
              <MenuSeparator />
              <MenuItem variant="danger" onClick={() => setModal("delete")}>
                删除用户
              </MenuItem>
            </>
          )}
        </MenuContent>
      </Menu>
    </>
  );
}