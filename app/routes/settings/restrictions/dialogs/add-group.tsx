import { type } from "arktype";

import Button from "~/components/button";
import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import Text from "~/components/text";
import Title from "~/components/title";
import { useForm } from "~/hooks/use-form";

const groupSchema = type({
  group: "string > 0",
});

interface AddGroupProps {
  groups: string[];
  isDisabled?: boolean;
}

export default function AddGroup({ groups, isDisabled }: AddGroupProps) {
  const form = useForm({
    schema: groupSchema,
    validate: (values) => {
      const group = (values.group as string).trim();
      if (group.length === 0) return undefined;

      if (groups.includes(group)) {
        return { group: "该组已存在于列表中。" };
      }

      return undefined;
    },
  });

  return (
    <Dialog>
      <Button disabled={isDisabled}>添加组</Button>
      <DialogPanel>
        <Title>添加组</Title>
        <Text className="mb-4">
          将此组添加到允许通过 OIDC 使用 Headscale 认证的组列表中。
        </Text>
        <input name="action_id" type="hidden" value="add_group" />
        <Input
          {...form.field("group")}
          description="允许用于 OIDC 认证的组。"
          required
          label="组"
          placeholder="admin"
        />
      </DialogPanel>
    </Dialog>
  );
}
