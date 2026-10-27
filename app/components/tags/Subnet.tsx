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
          <>此设备通告了子网路由。</>
        ) : (
          <>
            此设备有等待批准的子网路由。请在该设备的菜单中通过“编辑路由设置”进行审核。
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
