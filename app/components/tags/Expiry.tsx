import Chip from "../chip";
import Tooltip from "../tooltip";

export interface ExpiryTagProps {
  variant: "expired" | "no-expiry";
  expiry?: string;
}

export function ExpiryTag({ variant, expiry }: ExpiryTagProps) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Tooltip
      content={
        variant === "expired" ? (
          <>
            这台机器已过期，将无法连接到网络。请在该机器上重新使用 Tailscale 认证以重新启用它。
          </>
        ) : (
          <>这台机器已禁用密钥过期，永远不需要重新认证。</>
        )
      }
    >
      <Chip
        text={
          variant === "expired" ? `已过期 ${formatter.format(new Date(expiry!))}` : "无过期时间"
        }
        className="bg-mist-200 text-mist-800 dark:bg-mist-800 dark:text-mist-200"
      />
    </Tooltip>
  );
}
