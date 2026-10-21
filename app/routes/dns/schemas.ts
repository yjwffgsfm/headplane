import * as v from "valibot";

export const nameserver = v.pipe(v.string(), v.trim(), v.ip("请输入 IPv4 或 IPv6 地址。"));

export const recordValue = {
  A: v.pipe(v.string(), v.trim(), v.ipv4("请输入 IPv4 地址。")),
  AAAA: v.pipe(v.string(), v.trim(), v.ipv6("请输入 IPv6 地址。")),
};
