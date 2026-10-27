import Chip from "../chip";
import Tooltip from "../tooltip";

export function HeadplaneAgentTag() {
  return (
    <Tooltip content="此设备正在运行 Headplane Agent，因此可以在 Web 界面中提供主机信息。">
      <Chip text="Agent" />
    </Tooltip>
  );
}
