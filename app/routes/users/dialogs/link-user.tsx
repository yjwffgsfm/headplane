import Dialog, { DialogPanel } from "~/components/dialog";
import Notice from "~/components/notice";
import Text from "~/components/text";
import Title from "~/components/title";
import cn from "~/utils/cn";

interface LinkUserProps {
  headplaneUserId: string;
  displayName: string;
  headscaleUsers: { id: string; name: string }[];
  currentLink?: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function LinkUser({
  headplaneUserId,
  displayName,
  headscaleUsers,
  currentLink,
  isOpen,
  setIsOpen,
}: LinkUserProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <DialogPanel>
        <Title>为 {displayName} 关联 Headscale 用户</Title>
        <Text className="mb-6">
          选择此身份应关联到哪个 Headscale 用户。这将控制他们可以管理哪些机器，并启用自助服务功能。
        </Text>
        {headscaleUsers.length === 0 ? (
          <Notice>所有 Headscale 用户都已关联到其他账户。</Notice>
        ) : (
          <>
            <input name="action_id" type="hidden" value="link_user" />
            <input name="headplane_user_id" type="hidden" value={headplaneUserId} />
            <select
              className={cn(
                "w-full rounded-lg border p-2",
                "border-mist-200 dark:border-mist-700",
                "bg-mist-50 dark:bg-mist-900",
              )}
              defaultValue={currentLink ?? ""}
              name="headscale_user_id"
              required
            >
              <option value="">选择一个 Headscale 用户...</option>
              {headscaleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.id === currentLink ? "（当前）" : ""}
                </option>
              ))}
            </select>
          </>
        )}
      </DialogPanel>
    </Dialog>
  );
}
