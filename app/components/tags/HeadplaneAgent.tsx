import cn from "~/utils/cn";

import Chip from "../chip";
import Tooltip from "../tooltip";

export function HeadplaneAgentTag() {
  return (
    <Tooltip content="这台机器正在运行 Headplane 代理，它可以在网页界面中提供主机信息。">
      <Chip
        text="Headplane 代理"
        className={cn("bg-purple-300 text-purple-900 dark:bg-purple-900 dark:text-purple-300")}
      />
    </Tooltip>
  );
}
