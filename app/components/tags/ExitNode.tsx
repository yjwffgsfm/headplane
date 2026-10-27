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
          <>此设备正在作为出口节点运行。</>
        ) : (
          <>
            此设备请求作为出口节点使用。请在该设备的菜单中通过“编辑路由设置”进行审核。
          </>
        )
      }
    >
      <Chip text="出口节点" variant={isEnabled ? "neutral" : "warn"} />
    </Tooltip>
  );
}
