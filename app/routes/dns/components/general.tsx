import { useFetcher } from "react-router";

import Callout from "~/components/callout";
import Section, { SettingList, SettingRow } from "~/components/section";
import Switch from "~/components/switch";
import type { ActionResult } from "~/utils/form";

import RenameTailnet from "./rename-tailnet";

interface Props {
  baseDomain: string;
  isMagicDns: boolean;
  isOverrideDns: boolean;
  isDisabled: boolean;
}

export default function General({ baseDomain, isMagicDns, isOverrideDns, isDisabled }: Props) {
  const magic = useToggle("toggle_magic", isMagicDns);
  const override = useToggle("override_dns", isOverrideDns);
  const error = magic.error ?? override.error;

  return (
    <Section description="你的 Tailnet 域名以及设备如何选择 DNS 服务器。" title="常规">
      <SettingList>
        <SettingRow
          action={<RenameTailnet isDisabled={isDisabled} name={baseDomain} />}
          label="Tailnet 名称"
        >
          <span className="font-mono text-xs">{baseDomain}</span>
        </SettingRow>
        <SettingRow
          action={
            <Switch
              checked={magic.isEnabled}
              disabled={isDisabled}
              label="MagicDNS"
              onCheckedChange={magic.submit}
            />
          }
          label="MagicDNS"
        >
          {magic.isEnabled ? (
            <span className="font-mono text-xs">[device].{baseDomain}</span>
          ) : (
            <span className="text-muted">设备只能通过 IP 访问</span>
          )}
        </SettingRow>
        <SettingRow
          action={
            <Switch
              checked={override.isEnabled}
              disabled={isDisabled}
              label="覆盖本地 DNS"
              onCheckedChange={override.submit}
            />
          }
          label="覆盖本地 DNS"
        >
          <span className="text-muted">
            {override.isEnabled
              ? "设备会将所有查询发送至下方名称服务器"
              : "设备保留自己的 DNS 设置"}
          </span>
        </SettingRow>
      </SettingList>
      {error && (
        <Callout className="mt-3" variant="error">
          {error}
        </Callout>
      )}
    </Section>
  );
}

// Each switch gets its own fetcher so flipping both quickly doesn't cancel
// the first submit.
function useToggle(intent: string, isSaved: boolean) {
  const fetcher = useFetcher<ActionResult>();
  const pending = fetcher.formData?.get("enabled");

  return {
    isEnabled: pending ? pending === "true" : isSaved,
    error:
      fetcher.data?.ok === false
        ? (fetcher.data.errors.form ?? "无法保存设置。")
        : undefined,
    submit: (checked: boolean) => {
      fetcher.submit({ intent, enabled: String(checked) }, { method: "POST" });
    },
  };
}
