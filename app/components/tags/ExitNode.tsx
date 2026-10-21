import Chip from "../chip";
import Tooltip from "../tooltip";

export interface ExitNodeTagProps {
  isEnabled?: boolean;
}

export function ExitNodeTag({ isEnabled }: ExitNodeTagProps) {
  return (
    <Tooltip
      content={
        isEnabled ? (
          <>此设备正作为出口节点运行。</>
        ) : (
          <>
            此设备正在申请被用作出口节点。请在设备菜单的“编辑路由设置”中审核。
          </>
        )
      }
    >
      <Chip text="出口节点" variant={isEnabled ? "neutral" : "warn"} />
    </Tooltip>
  );
}
