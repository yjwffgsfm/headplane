import cn from "~/utils/cn";

import Chip from "../chip";
import Tooltip from "../tooltip";

export function TailscaleSSHTag() {
  return (
    <Tooltip content="此机器正在通告 Tailscale SSH，允许您使用 Tailscale 账户并通过 Headplane Web 界面进行 SSH 身份验证。">
      <Chip
        text="Tailscale SSH"
        className={cn("bg-lime-500 text-lime-900 dark:bg-lime-900 dark:text-lime-500")}
      />
    </Tooltip>
  );
}
