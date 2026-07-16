import Attribute from "~/components/attribute";
import type { PreAuthKey, User } from "~/types";
import { getUserDisplayName } from "~/utils/user";

import ExpireAuthKey from "./dialogs/expire-auth-key";

interface Props {
  authKey: PreAuthKey;
  user: User | null;
}

export default function AuthKeyRow({ authKey, user }: Props) {
  const createdAt = new Date(authKey.createdAt).toLocaleString();
  const expiration = new Date(authKey.expiration).toLocaleString();
  const isExpired =
    (authKey.used && !authKey.reusable) || new Date(authKey.expiration) < new Date();
  const userDisplay = user ? getUserDisplayName(user) : "(仅标签)";

  return (
    <div className="w-full">
      <Attribute name="密钥" value={authKey.key} />
      <Attribute name="用户" value={userDisplay} />
      <Attribute name="可重复使用" value={authKey.reusable ? "是" : "否"} />
      <Attribute name="临时" value={authKey.ephemeral ? "是" : "否"} />
      <Attribute name="已使用" value={authKey.used ? "是" : "否"} />
      <Attribute name="创建时间" value={createdAt} />
      <Attribute name="过期时间" value={expiration} />
      {!isExpired && user && (
        <div className="mt-2" suppressHydrationWarning>
          <ExpireAuthKey authKey={authKey} user={user} />
        </div>
      )}
    </div>
  );
}
