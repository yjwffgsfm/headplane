import { type } from "arktype";

import Button from "~/components/button";
import Dialog, { DialogPanel } from "~/components/dialog";
import Input from "~/components/input";
import Text from "~/components/text";
import Title from "~/components/title";
import { useForm } from "~/hooks/use-form";

const domainSchema = type({
  domain: "string > 0",
});

interface AddDomainProps {
  domains: string[];
  isDisabled?: boolean;
}

export default function AddDomain({ domains, isDisabled }: AddDomainProps) {
  const form = useForm({
    schema: domainSchema,
    validate: (values) => {
      const domain = (values.domain as string).trim();
      if (domain.length === 0) return undefined;

      if (domains.includes(domain)) {
        return { domain: "该域名已存在于列表中。" };
      }

      try {
        const url = new URL(`http://${domain}`);
        if (url.hostname !== domain) {
          return { domain: "这不是有效的域名。" };
        }
      } catch {
        return { domain: "这不是有效的域名。" };
      }

      return undefined;
    },
  });
  const domain = (form.values.domain as string).trim();

  return (
    <Dialog>
      <Button disabled={isDisabled}>添加域名</Button>
      <DialogPanel>
        <Title>添加域名</Title>
        <Text className="mb-4">
          将此域名添加到允许通过 OIDC 使用 Headscale 认证的电子邮件域名列表中。
        </Text>
        <input name="action_id" type="hidden" value="add_domain" />
        <Input
          {...form.field("domain")}
          description={
            domain.length > 0
              ? `匹配 <user>@${domain} 的用户`
              : "输入一个域名以匹配其电子邮件地址对应的用户。"
          }
          required
          label="域名"
          placeholder="example.com"
        />
      </DialogPanel>
    </Dialog>
  );
}
