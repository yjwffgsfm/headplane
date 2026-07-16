import { Info } from "lucide-react";

import cn from "~/utils/cn";

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
          <>此机器正在作为出口节点运行。</>
        ) : (
          <>此机器正在请求作为出口节点使用。请从机器菜单中的“编辑路由设置...”选项进行审核。</>
        )
      }
    >
      <Chip
        text="出口节点"
        className={cn("bg-blue-300 text-blue-900 dark:bg-blue-900 dark:text-blue-300")}
        rightIcon={isEnabled ? undefined : <Info className="h-full w-fit" />}
      />
    </Tooltip>
  );
}
