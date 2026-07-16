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
        return { group: "此群组已存在于列表中。" };
      }

      return undefined;
    },
  });

  return (
    <Dialog>
      <Button disabled={isDisabled}>添加群组</Button>
      <DialogPanel>
        <Title>添加群组</Title>
        <Text className="mb-4">
          将此群组添加到允许的群组列表中，这些群组可以通过 OIDC 在 Headscale 上进行认证。
        </Text>
        <input name="action_id" type="hidden" value="add_group" />
        <Input
          {...form.field("group")}
          description="允许进行 OIDC 认证的群组。"
          required
          label="群组"
          placeholder="admin"
        />
      </DialogPanel>
    </Dialog>
  );
}
