import ActionDialog from "~/components/action-dialog";
import Callout from "~/components/callout";
import Select from "~/components/select";

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
  const hasChoices = headscaleUsers.length > 0;

  return (
    <ActionDialog
      description="关联的 Headscale 用户决定其可以管理哪些设备，并启用自助功能。"
      fields={{ headplane_user_id: headplaneUserId }}
      intent="link"
      isDisabled={!hasChoices}
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="关联用户"
      title={`将 Headscale 用户关联到 ${displayName}`}
    >
      {hasChoices ? (
        <Select
          defaultValue={currentLink ?? null}
          items={headscaleUsers.map((user) => ({
            value: user.id,
            label: user.id === currentLink ? `${user.name}（当前）` : user.name,
          }))}
          label="Headscale 用户"
          name="headscale_user_id"
          placeholder="选择 Headscale 用户"
          required
        />
      ) : (
        <Callout>所有 Headscale 用户都已关联到其他账户。</Callout>
      )}
    </ActionDialog>
  );
}
