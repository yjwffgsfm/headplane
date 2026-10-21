import Chip from "../chip";
import Tooltip from "../tooltip";

export function TailscaleSSHTag() {
  return (
    <Tooltip content="此设备通告了 Tailscale SSH，可通过 Tailscale 账户以及 Headplane Web 界面认证 SSH 凭据。">
      <Chip text="SSH" />
    </Tooltip>
  );
}
