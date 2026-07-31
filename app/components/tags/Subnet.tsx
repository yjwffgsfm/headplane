import { Info } from "lucide-react";

import cn from "~/utils/cn";

import Chip from "../chip";
import Tooltip from "../tooltip";

export interface SubnetTagProps {
  isEnabled?: boolean;
}

export function SubnetTag({ isEnabled }: SubnetTagProps) {
  return (
    <Tooltip
      content={
        isEnabled ? (
          <>这台机器在通告子网路由。</>
        ) : (
          <>
            这台机器有未通告的子网路由。请在机器菜单中的“编辑路由设置...”中查看。
          </>
        )
      }
    >
      <Chip
        text="子网"
        className={cn("bg-blue-300 text-blue-900 dark:bg-blue-900 dark:text-blue-300")}
        rightIcon={isEnabled ? undefined : <Info className="h-full w-fit" />}
      />
    </Tooltip>
  );
}
