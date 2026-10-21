import ActionDialog from "~/components/action-dialog";
import Callout from "~/components/callout";
import Section, { RemoveButton, Row, RowList } from "~/components/section";

import AddDomain from "../dialogs/add-domain";
import { useReorder } from "./reorder";

interface Props {
  searchDomains: string[];
  isDisabled: boolean;
  magic?: string;
}

export default function ManageDomains({ searchDomains, isDisabled, magic }: Props) {
  const reorder = useReorder("move_domain", "domain");
  const domains = reorder.order(searchDomains);

  return (
    <Section
      action={isDisabled ? undefined : <AddDomain />}
      description="设备解析短名称时会按顺序尝试这些后缀。启用 MagicDNS 后，Tailnet 域名始终排在最前。"
      title="搜索域"
    >
      {reorder.error && (
        <Callout className="mb-3" variant="error">
          {reorder.error}
        </Callout>
      )}
      {!magic && domains.length === 0 ? (
        <p className="text-muted py-2.5 text-sm">没有搜索域</p>
      ) : (
        <RowList>
          {magic && (
            <Row action={<span className="text-muted px-2">MagicDNS</span>}>
              <span className="font-mono text-xs break-all">{magic}</span>
            </Row>
          )}
          {domains.map((domain, index) => (
            <Row
              action={
                <div className="flex items-center gap-1">
                  {!isDisabled && reorder.controls(domains, index)}
                  <ActionDialog
                    description="设备解析短名称时将不再尝试此后缀。"
                    fields={{ domain }}
                    intent="remove_domain"
                    isDestructive
                    submitLabel="移除"
                    title={`移除搜索域 ${domain}？`}
                    trigger={<RemoveButton disabled={isDisabled} />}
                  />
                </div>
              }
              className="group/row"
              key={domain}
            >
              <span className="font-mono text-xs break-all">{domain}</span>
            </Row>
          ))}
        </RowList>
      )}
    </Section>
  );
}
