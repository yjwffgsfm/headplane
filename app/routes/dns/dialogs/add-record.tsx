import { type } from "arktype";

import Button from "~/components/button";
import Code from "~/components/code";
import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import Select from "~/components/select";
import Text from "~/components/text";
import Title from "~/components/title";
import { useForm } from "~/hooks/use-form";

const recordSchema = type({
  record_type: "'A' | 'AAAA'",
  record_name: "string > 0",
  record_value: "string > 0",
});

interface Props {
  records: { name: string; type: "A" | "AAAA" | string; value: string }[];
}

export default function AddRecord({ records }: Props) {
  const form = useForm({
    schema: recordSchema,
    defaultValues: { record_type: "A" },
    validate: (values) => {
      const name = values.record_name as string;
      const ip = values.record_value as string;
      if (name.length === 0 || ip.length === 0) return undefined;

      const lookup = records.find((r) => r.name === name);
      if (lookup?.value === ip) {
        return {
          record_name: "此记录已存在。",
          record_value: "此记录已存在。",
        };
      }

      return undefined;
    },
  });
  const name = form.values.record_name as string;
  const ip = form.values.record_value as string;
  const recordType = form.values.record_type as string;
  const isDuplicate =
    !!form.errors.record_name?.includes("already exists") &&
    !!form.errors.record_value?.includes("already exists");

  return (
    <Dialog>
      <Button>添加 DNS 记录</Button>
      <DialogPanel onSubmit={() => form.reset()}>
        <Title>添加 DNS 记录</Title>
        <Text>输入新 DNS 记录的域名和 IP 地址。</Text>
        <div className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="action_id" value="add_record" />
          <Select
            required
            label="记录类型"
            name="record_type"
            defaultValue={recordType}
            onValueChange={(v) => {
              if (v) form.setValue("record_type", v);
            }}
            items={[
              { value: "A", label: "A" },
              { value: "AAAA", label: "AAAA" },
            ]}
          />
          <Input
            {...form.field("record_name")}
            required
            label="域名"
            placeholder="test.example.com"
          />
          <Input
            {...form.field("record_value")}
            required
            label="IP 地址"
            placeholder={recordType === "AAAA" ? "2001:db8::ff00:42:8329" : "101.101.101.101"}
          />
          {isDuplicate ? (
            <p className="text-sm opacity-50">
              域名 <Code>{name}</Code> 和 IP 地址 <Code>{ip}</Code> 的记录已存在。
            </p>
          ) : undefined}
        </div>
      </DialogPanel>
    </Dialog>
  );
}
