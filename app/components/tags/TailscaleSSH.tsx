import Chip from "../chip";
import Tooltip from "../tooltip";

export function TailscaleSSHTag() {
  return (
    <Tooltip content="此设备通告了 Tailscale SSH，因此可以使用 Tailscale 账户在 Headplane Web 界面中认证 SSH 凭据。">
      <Chip text="SSH" />
    </Tooltip>
  );
}
