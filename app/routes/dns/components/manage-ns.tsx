import { Info } from "lucide-react";
import { Form, useSubmit } from "react-router";

import Button from "~/components/button";
import Link from "~/components/link";
import Switch from "~/components/switch";
import TableList from "~/components/table-list";
import Tooltip from "~/components/tooltip";
import cn from "~/utils/cn";

import AddNS from "../dialogs/add-ns";

interface Props {
  nameservers: Record<string, string[]>;
  overrideLocalDns: boolean;
  isDisabled: boolean;
}

export default function ManageNS({ nameservers, isDisabled, overrideLocalDns }: Props) {
  return (
    <div className="flex w-full flex-col sm:w-2/3">
      <h1 className="mb-4 text-2xl font-medium">名称服务器</h1>
      <p>
        设置 Tailnet 上设备用于解析 DNS 查询的名称服务器。{" "}
        <Link external styled to="https://tailscale.com/kb/1054/dns">
          了解更多
        </Link>
      </p>
      <div className="mt-4">
        {Object.keys(nameservers).map((key) => (
          <NameserverList
            isDisabled={isDisabled}
            isGlobal={key === "global"}
            key={key}
            name={key}
            nameservers={nameservers}
            overrideLocalDns={overrideLocalDns}
          />
        ))}

        {isDisabled ? undefined : <AddNS nameservers={nameservers} />}
      </div>
    </div>
  );
}

interface ListProps {
  isGlobal: boolean;
  isDisabled: boolean;
  nameservers: Record<string, string[]>;
  overrideLocalDns: boolean;
  name: string;
}

function NameserverList({ isGlobal, isDisabled, nameservers, overrideLocalDns, name }: ListProps) {
  const list = isGlobal ? nameservers.global : nameservers[name];
  const submit = useSubmit();

  if (list.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        {isGlobal ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-md font-medium opacity-80">全局名称服务器</h2>
            <div className="flex items-center gap-2 text-sm">
              <Tooltip
                content={
                  <>
                    启用后，使用下方列出的 DNS 服务器来解析 Tailnet
                    外部的名称。禁用时（默认），设备将优先使用其本地 DNS 配置。{" "}
                    <Link external styled to="https://tailscale.com/kb/1054/dns#global-nameservers">
                      了解更多
                    </Link>
                  </>
                }
              >
                <Info className="size-4" />
              </Tooltip>
              <p>覆盖 DNS 服务器</p>
              <Switch
                className="h-[15px] w-[23px] p-0.5"
                defaultChecked={overrideLocalDns}
                label="覆盖本地 DNS 设置"
                name="override_dns"
                onCheckedChange={(v) => {
                  submit(
                    {
                      action_id: "override_dns",
                      override_dns: v ? "true" : "false",
                    },
                    {
                      method: "POST",
                    },
                  );
                }}
                switchClassName="h-[9px] w-[9px]"
              />
            </div>
          </div>
        ) : (
          <h2 className="text-md font-medium opacity-80">{name}</h2>
        )}
      </div>
      <TableList>
        {list.length > 0
          ? list.map((ns) => (
              <TableList.Item key={ns}>
                <p className="font-mono text-sm">{ns}</p>
                <Form method="POST">
                  <input name="action_id" type="hidden" value="remove_ns" />
                  <input name="ns" type="hidden" value={ns} />
                  <input name="split_name" type="hidden" value={isGlobal ? "global" : name} />
                  <Button
                    className={cn("px-2 py-1 rounded-md", "text-red-500 dark:text-red-400")}
                    disabled={isDisabled}
                    type="submit"
                  >
                    移除
                  </Button>
                </Form>
              </TableList.Item>
            ))
          : undefined}
      </TableList>
    </div>
  );
}
