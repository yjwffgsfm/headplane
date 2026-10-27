import { formatTimeUntil } from "~/utils/time";

import Chip from "../chip";
import Tooltip from "../tooltip";

export interface ExpiryTagProps {
  variant: "expired" | "expiring" | "no-expiry";
  expiry?: string;
}

const formatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ExpiryTag({ variant, expiry }: ExpiryTagProps) {
  const date = expiry ? formatter.format(new Date(expiry)) : undefined;

  switch (variant) {
    case "expired":
      return (
        <Tooltip
          content={`此设备的密钥已于 ${date} 过期。请在该设备上使用 Tailscale 重新认证以重新连接。`}
        >
          <Chip text="已过期" variant="bad" />
        </Tooltip>
      );

    case "expiring":
      return (
        <Tooltip
          content={`此设备的密钥将于 ${date} 过期。请在此之前在该设备上使用 Tailscale 重新认证以保持连接。`}
        >
          <Chip text={`密钥过期：${formatTimeUntil(new Date(expiry!))}`} variant="warn" />
        </Tooltip>
      );

    case "no-expiry":
      return (
        <Tooltip content="此设备已禁用密钥过期，无需重新认证。">
          <Chip text="永不过期" />
        </Tooltip>
      );
  }
}
