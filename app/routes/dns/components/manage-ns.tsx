import ActionDialog from "~/components/action-dialog";
import Callout from "~/components/callout";
import Chip from "~/components/chip";
import Link from "~/components/link";
import Section, { RemoveButton, Row, RowList } from "~/components/section";

import AddNS from "../dialogs/add-ns";
import { useReorder } from "./reorder";

interface Props {
  global: string[];
  split: Record<string, string[]>;
  isDisabled: boolean;
}

export default function ManageNS({ global, split, isDisabled }: Props) {
  const reorder = useReorder("move_ns", "nameserver");

  // Global servers come first, then each split domain's servers. Order only
  // matters within a list, so each one moves on its own.
  const groups = [
    { domain: undefined, list: reorder.order(global, { split_domain: "" }) },
    ...Object.entries(split).map(([domain, list]) => ({
      domain,
      list: reorder.order(list, { split_domain: domain }),
    })),
  ];
  const rows = groups.flatMap(({ domain, list }) =>
    list.map((ns, index) => ({ ns, domain, list, index })),
  );

  return (
    <Section
      action={isDisabled ? undefined : <AddNS />}
      description={
        <>
          设备在解析 Tailnet 之外的名称时使用的服务器，列表中越靠前优先级越高。标记了域名的服务器只应答该域名。{" "}
          <Link external styled to="https://tailscale.com/kb/1054/dns">
            文档
          </Link>
        </>
      }
      title="名称服务器"
    >
      {reorder.error && (
        <Callout className="mb-3" variant="error">
          {reorder.error}
        </Callout>
      )}
      {rows.length === 0 ? (
        <p className="text-muted py-2.5 text-sm">没有名称服务器。设备将使用自己的 DNS 设置。</p>
      ) : (
        <RowList>
          {rows.map(({ ns, domain, list, index }) => (
            <Row
              action={
                <div className="flex items-center gap-1">
                  {!isDisabled &&
                    list.length > 1 &&
                    reorder.controls(list, index, { split_domain: domain ?? "" })}
                  <ActionDialog
                    description={
                      domain
                        ? `设备将不再使用此名称服务器解析 ${domain}。`
                        : "设备将不再使用此名称服务器解析 Tailnet 之外的查询。"
                    }
                    fields={domain ? { nameserver: ns, split_domain: domain } : { nameserver: ns }}
                    intent="remove_ns"
                    isDestructive
                    submitLabel="移除"
                    title={`移除名称服务器 ${ns}？`}
                    trigger={<RemoveButton disabled={isDisabled} />}
                  />
                </div>
              }
              className="group/row"
              key={`${domain ?? ""}/${ns}`}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs break-all">{ns}</span>
                {domain && <Chip text={domain} />}
              </span>
            </Row>
          ))}
        </RowList>
      )}
    </Section>
  );
}
