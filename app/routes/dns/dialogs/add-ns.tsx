import { type } from "arktype";
import { Split } from "lucide-react";

import Button from "~/components/button";
import Chip from "~/components/chip";
import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import Switch from "~/components/switch";
import Text from "~/components/text";
import Title from "~/components/title";
import Tooltip from "~/components/tooltip";
import { useForm } from "~/hooks/use-form";
import cn from "~/utils/cn";

const nsSchema = type({
  ns: "string.ip",
  split_name: "string > 0",
});

interface Props {
  nameservers: Record<string, string[]>;
}

export default function AddNameserver({ nameservers }: Props) {
  const form = useForm({
    schema: nsSchema,
    defaultValues: { split_name: "global" },
    validate: (values) => {
      const ns = values.ns as string;
      const domain = values.split_name as string;
      if (!ns) return undefined;

      const isSplit = domain !== "global";
      const isDuplicate = isSplit
        ? nameservers[domain]?.includes(ns)
        : Object.values(nameservers).some((nsList) => nsList.includes(ns));

      if (isDuplicate) {
        return { ns: "此名称服务器已存在。" };
      }

      return undefined;
    },
  });
  const split = (form.values.split_name as string) !== "global";

  return (
    <Dialog>
      <Button>添加名称服务器</Button>
      <DialogPanel>
        <Title className="mb-4">添加名称服务器</Title>
        <input name="action_id" type="hidden" value="add_ns" />
        <Input
          {...form.field("ns")}
          description="使用此 IPv4 或 IPv6 地址来解析域名。"
          required
          label="名称服务器"
          placeholder="1.2.3.4"
        />
        <div className="mt-8 flex items-center justify-between">
          <div className="block">
            <div className="inline-flex items-center gap-2">
              <Text className="font-semibold">限制到特定域名</Text>
              <Tooltip content="只有支持拆分 DNS 的客户端（大多数平台上的 Tailscale v1.8 或更高版本）才会使用此名称服务器。旧版客户端会忽略它。">
                <Chip
                  className={cn("inline-flex items-center")}
                  leftIcon={<Split className="mr-0.5 h-3 w-3" />}
                  text="拆分 DNS"
                />
              </Tooltip>
            </div>
            <Text className="text-sm">此名称服务器仅用于某些域名。</Text>
          </div>
          <Switch
            label="拆分 DNS"
            onCheckedChange={(checked) => {
              form.setValue("split_name", checked ? "" : "global");
            }}
          />
        </div>
        {split ? (
          <>
            <Text className="mt-8 font-semibold">域名</Text>
            <Input {...form.field("split_name")} required label="域名" placeholder="example.com" />
            <Text className="text-sm">
              只有匹配此后缀的单标签或完全限定查询才应使用此名称服务器。
            </Text>
          </>
        ) : (
          <input name="split_name" type="hidden" value="global" />
        )}
      </DialogPanel>
    </Dialog>
  );
}
