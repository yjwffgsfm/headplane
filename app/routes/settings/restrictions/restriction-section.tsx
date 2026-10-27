import ActionDialog from "~/components/action-dialog";
import Section, { RemoveButton, Row, RowList } from "~/components/section";

import AddRestriction from "./dialogs/add-restriction";
import type { RestrictionType } from "./schemas";

const copy = {
  domain: {
    title: "邮箱域名",
    description: "只有邮箱地址属于这些域名之一的人才能登录。",
    empty: "任何邮箱域名都可以登录。",
    noun: "域名",
  },
  group: {
    title: "组",
    description: "只有身份提供方中这些组之一的成员才能登录。",
    empty: "任何组都可以登录。",
    noun: "组",
  },
  user: {
    title: "用户",
    description: "只有身份提供方中的这些用户才能登录。",
    empty: "任何用户都可以登录。",
    noun: "用户",
  },
};

interface Props {
  type: RestrictionType;
  values: string[];
  isDisabled: boolean;
}

export default function RestrictionSection({ type, values, isDisabled }: Props) {
  const { title, description, empty, noun } = copy[type];

  return (
    <Section
      action={isDisabled ? undefined : <AddRestriction type={type} />}
      description={description}
      title={title}
    >
      {values.length === 0 ? (
        <p className="text-muted py-2.5 text-sm">{empty}</p>
      ) : (
        <RowList>
          {values.map((value) => (
            <Row
              action={
                <ActionDialog
                  description={`只有剩余的${noun}可以登录。如果没有剩余，所有${noun}都可以登录。`}
                  fields={{ type, value }}
                  intent="remove"
                  isDestructive
                  submitLabel="移除"
                  title={`移除 ${value}？`}
                  trigger={<RemoveButton disabled={isDisabled} />}
                />
              }
              key={value}
            >
              <span className="font-mono text-xs break-all">{value}</span>
            </Row>
          ))}
        </RowList>
      )}
    </Section>
  );
}
