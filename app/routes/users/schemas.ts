import * as v from "valibot";

import { validateUsername } from "~/utils/user";

export const username = v.pipe(
  v.string(),
  v.check((name) => validateUsername(name) === undefined, "请输入有效的用户名。"),
);
