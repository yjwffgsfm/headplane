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
          <>此机器已过期，将无法连接到网络。请在机器上重新通过 Tailscale 进行身份验证以重新启用。</>
        ) : (
          <>此机器已禁用密钥过期，无需重新进行身份验证。</>
        )
      }
    >
      <Chip
        text={variant === "expired" ? `已过期 ${formatter.format(new Date(expiry!))}` : "永不过期"}
        className="bg-mist-200 text-mist-800 dark:bg-mist-800 dark:text-mist-200"
      />
    </Tooltip>
  );
}
