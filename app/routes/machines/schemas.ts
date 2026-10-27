import * as v from "valibot";

export const machineName = v.pipe(
  v.string(),
  v.regex(
    /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i,
    "只能使用字母、数字和连字符，且以字母或数字开头和结尾。",
  ),
);
