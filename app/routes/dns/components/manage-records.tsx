import ActionDialog from "~/components/action-dialog";
import Code from "~/components/code";
import Link from "~/components/link";
import Section, { RemoveButton, Row, RowList } from "~/components/section";

import AddRecord from "../dialogs/add-record";

interface Props {
  records: { name: string; type: "A" | string; value: string }[];
  hasRecordsFile: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
}

export default function ManageRecords({ records, hasRecordsFile, isDisabled, isReadOnly }: Props) {
  const isLocked = isDisabled || isReadOnly;

  return (
    <Section
      action={isLocked ? undefined : <AddRecord />}
      description={
        <>
          将名称指向 Tailnet 网络中设备的地址。Headscale 支持 A 和 AAAA 记录。参阅{" "}
          <Link external styled to="https://headscale.net/stable/ref/dns">
            DNS 文档
          </Link>
          {!isDisabled && isReadOnly && hasRecordsFile && (
            <>
              {" "}
              要在此编辑记录，请授予 Headplane 对 <Code>dns.extra_records_path</Code> 所在文件的写入权限。
            </>
          )}
          {!isDisabled && isReadOnly && !hasRecordsFile && (
            <>
              {" "}
              要在此编辑记录，请将其从 <Code>dns.extra_records</Code> 移动到一个设置为{" "}
              <Code>dns.extra_records_path</Code> 的 JSON 文件中。
            </>
          )}
        </>
      }
      title="DNS 记录"
    >
      {records.length === 0 ? (
        <p className="text-muted py-2.5 text-sm">暂无 DNS 记录</p>
      ) : (
        <RowList>
          {records.map((record) => (
            <Row
              action={
                <ActionDialog
                  description="设备将不再把此名称解析为该记录的地址。"
                  fields={{ name: record.name, type: record.type }}
                  intent="remove_record"
                  isDestructive
                  submitLabel="移除"
                  title={`移除 ${record.name} 的 ${record.type} 记录？`}
                  trigger={<RemoveButton disabled={isLocked} />}
                />
              }
              key={`${record.name}-${record.type}-${record.value}`}
            >
              <span className="grid grid-cols-1 gap-x-4 font-mono text-xs sm:grid-cols-2">
                <span className="break-all">{record.name}</span>
                <span className="break-all">
                  <span className="text-muted mr-2 inline-block w-8">{record.type}</span>
                  {record.value}
                </span>
              </span>
            </Row>
          ))}
        </RowList>
      )}
    </Section>
  );
}
