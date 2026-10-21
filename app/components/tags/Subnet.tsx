import Chip from "../chip";
import Tooltip from "../tooltip";

export interface SubnetTagProps {
  isEnabled?: boolean;
  count: number;
}

export function SubnetTag({ isEnabled, count }: SubnetTagProps) {
  return (
    <Tooltip
      content={
        isEnabled ? (
          <>此设备正在通告子网路由。</>
        ) : (
          <>
            此设备有子网路由待批准。请在设备菜单的“编辑路由设置”中审核。
          </>
        )
      }
    >
      <Chip
        text={`${count} 个子网`}
        variant={isEnabled ? "neutral" : "warn"}
      />
    </Tooltip>
  );
}
