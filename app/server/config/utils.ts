import type { Traversal } from "arktype";

import log from "~/utils/log";

export function deprecatedField() {
  return (_: unknown, ctx: Traversal) => {
    log.warn("config", `${ctx.propString} 已弃用且不再生效。`);
    return true;
  };
}