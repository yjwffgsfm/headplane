import ActionDialog from "~/components/action-dialog";

interface TransferOwnershipProps {
  targetHeadplaneUserId: string;
  targetDisplayName: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function TransferOwnership({
  targetHeadplaneUserId,
  targetDisplayName,
  isOpen,
  setIsOpen,
}: TransferOwnershipProps) {
  return (
    <ActionDialog
      description={`${targetDisplayName} 将成为此 Headplane 实例的所有者，你则变为管理员。只有新的所有者才能将其转回。`}
      fields={{ headplane_user_id: targetHeadplaneUserId }}
      intent="transfer"
      isDestructive
      onOpenChange={setIsOpen}
      open={isOpen}
      submitLabel="转移所有权"
      title={`将所有权转移给 ${targetDisplayName}？`}
    />
  );
}
