import * as v from "valibot";

export const restrictionTypes = ["domain", "group", "user"] as const;
export type RestrictionType = (typeof restrictionTypes)[number];

function isHostname(value: string) {
  try {
    return new URL(`http://${value}`).hostname === value;
  } catch {
    return false;
  }
}

export const restrictionValue = {
  domain: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("请输入域名。"),
    v.check(isHostname, "请输入类似 example.com 的域名。"),
  ),
  group: v.pipe(v.string(), v.trim(), v.nonEmpty("请输入组。")),
  user: v.pipe(v.string(), v.trim(), v.nonEmpty("请输入用户。")),
};
