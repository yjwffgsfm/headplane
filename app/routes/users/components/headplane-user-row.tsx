import Avatar from "~/components/avatar";
import Chip from "~/components/chip";
import { TableCell } from "~/components/table";
import type { Role } from "~/server/web/roles";
import cn from "~/utils/cn";
import { formatTimeDelta } from "~/utils/time";

import type { HeadplaneUserData } from "../overview";
import MachinesSeen from "./machines-seen";
import MenuOptions from "./menu";

interface HeadplaneUserRowProps {
  user: HeadplaneUserData;
  headscaleUsers: { id: string; name: string; claimed: boolean }[];
  isSelf?: boolean;
  isOwner?: boolean;
  canEditGroups?: boolean;
  policyGroups?: string[];
  policyHasComments?: boolean;
}

export default function HeadplaneUserRow({
  user,
  headscaleUsers,
  isSelf,
  isOwner,
  canEditGroups,
  policyGroups,
  policyHasComments,
}: HeadplaneUserRowProps) {
  const displayName = user.linkedHeadscaleUser?.displayName || user.name || user.email || user.sub;
  const displayUsername =
    user.linkedHeadscaleUser?.displayName &&
    user.linkedHeadscaleUser.displayName !== user.linkedHeadscaleUser.name
      ? user.linkedHeadscaleUser.name
      : undefined;
  const displayEmail = user.linkedHeadscaleUser?.email ?? user.email;

  return (
    <tr className="group">
      <TableCell>
        <div className="flex items-start gap-3">
          <Avatar name={displayName} src={user.profilePicUrl} />
          <div className="min-w-0">
            <p className="font-medium">{displayName}</p>
            <div className="text-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {displayUsername && <span>{displayUsername}</span>}
              {displayEmail && <span>{displayEmail}</span>}
              {user.groups.map((group) => (
                <span className="font-mono" key={group}>
                  {group}
                </span>
              ))}
              {!user.headscaleUserId && <Chip text="未关联" variant="warn" />}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className={cn(user.role === "member" && "text-muted")}>
        {mapRoleToName(user.role)}
      </TableCell>
      <TableCell className="text-muted whitespace-nowrap">
        {user.lastLoginAt ? (
          <span suppressHydrationWarning title={new Date(user.lastLoginAt).toLocaleString()}>
            {formatTimeDelta(new Date(user.lastLoginAt))}
          </span>
        ) : (
          "从不"
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <MachinesSeen machines={user.machines} />
      </TableCell>
      <TableCell className="w-12 text-right align-middle">
        <MenuOptions
          canEditGroups={canEditGroups}
          currentLink={user.headscaleUserId ?? undefined}
          headscaleUsers={headscaleUsers}
          isOwner={isOwner}
          isSelf={isSelf}
          policyGroups={policyGroups}
          policyHasComments={policyHasComments}
          user={user}
        />
      </TableCell>
    </tr>
  );
}

function mapRoleToName(role: Role) {
  switch (role) {
    case "owner":
      return "所有者";
    case "admin":
      return "管理员";
    case "network_admin":
      return "网络管理员";
    case "it_admin":
      return "IT 管理员";
    case "auditor":
      return "审计员";
    case "viewer":
      return "查看者";
    case "member":
      return "成员";
    default:
      return "未知";
  }
}
