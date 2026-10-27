import { Construction, Eye, FileX, FlaskConical, Pencil, Shield, TagsIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Suspense, lazy, useMemo, useState } from "react";
import { isRouteErrorResponse, useFetcher } from "react-router";

import Button from "~/components/button";
import Callout from "~/components/callout";
import Code from "~/components/code";
import Link from "~/components/link";
import PageError, { ErrorState } from "~/components/page-error";
import PageHeader from "~/components/page-header";
import { Tabs, TabsList, TabsPanel, TabsTab } from "~/components/tabs";
import { isApiError } from "~/server/headscale/api/error-client";
import {
  parsePolicy,
  policyDestinations,
  policySources,
  serializePolicy,
  type Policy,
} from "~/utils/acl-policy";
import type { ActionResult } from "~/utils/form";
import { toastClientAction } from "~/utils/toast";

import type { Route } from "./+types/overview";
import { aclAction } from "./acl-action";
import { aclLoader } from "./acl-loader";
import Fallback from "./components/fallback";
import RulesEditor from "./components/rules-editor";
import TagsGroupsEditor from "./components/tags-groups-editor";

const LazyEditor = lazy(() =>
  import("./components/cm.client").then((m) => ({ default: m.Editor })),
);
const LazyDiffer = lazy(() =>
  import("./components/cm.client").then((m) => ({ default: m.Differ })),
);

export const loader = aclLoader;
export const action = aclAction;
export const clientAction = toastClientAction;

export default function Page({
  loaderData: { access, writable, policy, users, tagUsage },
}: Route.ComponentProps) {
  const [codePolicy, setCodePolicy] = useState(policy);
  const [savedPolicy, setSavedPolicy] = useState(policy);
  if (savedPolicy !== policy) {
    setSavedPolicy(policy);
    setCodePolicy(policy);
  }

  const fetcher = useFetcher<ActionResult>();
  const disabled = !access || !writable; // Disable if no permission or not writable

  const parsed = useMemo(() => parsePolicy(codePolicy), [codePolicy]);
  const sources = useMemo(
    () => (parsed.ok ? policySources(parsed.policy, users) : []),
    [parsed, users],
  );
  const destinations = useMemo(
    () => (parsed.ok ? policyDestinations(parsed.policy, users) : []),
    [parsed, users],
  );

  // The structured editors round-trip through the policy text, so the file
  // editor, the diff view and Save all work off one source of truth.
  function applyPolicy(next: Policy) {
    setCodePolicy(serializePolicy(next));
  }

  function structuredPanel(render: (value: Policy) => ReactNode) {
    if (!parsed.ok) {
      return (
        <div className="p-4">
          <Callout
            className="my-4 max-w-2xl"
            title="无法可视化编辑策略"
            variant="error"
          >
            无法解析策略（{parsed.error}）。在<Code>编辑文件</Code>标签页中修复后，可视化编辑器就会恢复。
          </Callout>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 p-4">
        {parsed.hasComments ? (
          <Callout className="my-4 max-w-2xl" title="注释将被移除" variant="warning">
            此策略包含注释。保存可视化编辑器中的更改会重写策略并丢弃这些注释。
          </Callout>
        ) : null}
        {render(parsed.policy)}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        description={
          <>
            ACL 文件用于定义网络的访问控制规则。有关 ACL 文件的更多信息，请参阅{" "}
            <Link external styled to="https://tailscale.com/kb/1018/acls">
              Tailscale ACL 指南
            </Link>和{" "}
            <Link external styled to="https://headscale.net/stable/ref/acls/">
              Headscale 文档
            </Link>。
          </>
        }
        title="访问控制列表 (ACL)"
      />
      {!access ? (
        <Callout className="my-4 max-w-2xl" title="ACL 策略受限" variant="warning">
          你没有编辑访问控制列表策略所需的权限。请联系管理员申请访问权限或进行更改。
        </Callout>
      ) : !writable ? (
        <Callout className="my-4 max-w-2xl" title="只读 ACL 策略" variant="error">
          Headscale 配置中的 ACL 策略模式很可能设置为 <Code>file</Code>，这意味着无法通过 Web 界面编辑 ACL 文件。要解决此问题，需要在 Headscale 配置中将{" "}
          <Code>policy.mode</Code> 设置为 <Code>database</Code>。
        </Callout>
      ) : undefined}
      {fetcher.data?.ok === false && (
        <Callout className="my-4 max-w-2xl" title="无法保存策略" variant="error">
          {fetcher.data.errors.form ?? fetcher.data.errors.policy}
        </Callout>
      )}
      <Tabs className="mb-4" label="ACL 编辑器" defaultValue="rules">
        <TabsList>
          <TabsTab value="rules">
            <div className="flex items-center gap-2">
              <Shield className="p-1" />
              <span>规则</span>
            </div>
          </TabsTab>
          <TabsTab value="tags">
            <div className="flex items-center gap-2">
              <TagsIcon className="p-1" />
              <span>标签与组</span>
            </div>
          </TabsTab>
          <TabsTab value="edit">
            <div className="flex items-center gap-2">
              <Pencil className="p-1" />
              <span>编辑文件</span>
            </div>
          </TabsTab>
          <TabsTab value="diff">
            <div className="flex items-center gap-2">
              <Eye className="p-1" />
              <span>预览更改</span>
            </div>
          </TabsTab>
          <TabsTab value="preview">
            <div className="flex items-center gap-2">
              <FlaskConical className="p-1" />
              <span>预览规则</span>
            </div>
          </TabsTab>
        </TabsList>
        <TabsPanel value="rules">
          {structuredPanel((value) => (
            <RulesEditor
              destinations={destinations}
              isDisabled={disabled}
              onChange={applyPolicy}
              policy={value}
              sources={sources}
            />
          ))}
        </TabsPanel>
        <TabsPanel value="tags">
          {structuredPanel((value) => (
            <TagsGroupsEditor
              isDisabled={disabled}
              onChange={applyPolicy}
              policy={value}
              tagUsage={tagUsage}
              users={users}
            />
          ))}
        </TabsPanel>
        <TabsPanel value="edit">
          <Suspense fallback={<Fallback />}>
            <LazyEditor isDisabled={disabled} onChange={setCodePolicy} value={codePolicy} />
          </Suspense>
        </TabsPanel>
        <TabsPanel value="diff">
          <Suspense fallback={<Fallback />}>
            <LazyDiffer left={policy} right={codePolicy} />
          </Suspense>
        </TabsPanel>
        <TabsPanel value="preview">
          <div className="flex flex-col items-center py-8">
            <Construction />
            <p className="mt-4 w-1/2 text-center">
              规则预览功能尚不可用。该功能仍在开发中，实现起来相当复杂，希望很快能够完成。
            </p>
          </div>
        </TabsPanel>
      </Tabs>
      <Button
        className="mr-2"
        disabled={
          disabled || fetcher.state !== "idle" || codePolicy.length === 0 || codePolicy === policy
        }
        onClick={() => {
          fetcher.submit({ intent: "save", policy: codePolicy }, { method: "POST" });
        }}
        variant="primary"
      >
        保存
      </Button>
      <Button
        disabled={disabled || fetcher.state !== "idle" || codePolicy === policy}
        onClick={() => {
          // Reset the editor to the original policy
          setCodePolicy(policy);
        }}
      >
        放弃更改
      </Button>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (
    isRouteErrorResponse(error) &&
    isApiError(error.data) &&
    error.data.rawData.includes("reading policy from path") &&
    error.data.rawData.includes("no such file or directory")
  ) {
    return (
      <ErrorState
        description={
          <>
            Headscale 被设置为从文件读取策略，但该文件不存在。请在 Headscale 配置中的路径创建该文件，或将 <Code>policy.mode</Code> 设置为 <Code>database</Code>，以便 Headplane 在此管理策略。
          </>
        }
        icon={<FileX />}
        title="策略文件缺失"
      />
    );
  }

  return <PageError error={error} page="访问控制策略" />;
}
