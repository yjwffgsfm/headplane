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
          <>这台机器正在充当出口节点。</>
        ) : (
          <>
            这台机器请求被用作出口节点。请在机器菜单中的“编辑路由设置...”中查看。
          </>
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
