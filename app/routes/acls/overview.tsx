import { AlertCircle, Construction, Eye, FlaskConical, Pencil } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import { isRouteErrorResponse, useFetcher, useRevalidator } from "react-router";

import Button from "~/components/button";
import Card from "~/components/card";
import Code from "~/components/code";
import Link from "~/components/link";
import Notice from "~/components/notice";
import PageError from "~/components/page-error";
import { Tabs, TabsList, TabsPanel, TabsTab } from "~/components/tabs";
import { isApiError } from "~/server/headscale/api/error-client";
import toast from "~/utils/toast";

import type { Route } from "./+types/overview";
import { aclAction } from "./acl-action";
import { aclLoader } from "./acl-loader";
import Fallback from "./components/fallback";

const LazyEditor = lazy(() =>
  import("./components/cm.client").then((m) => ({ default: m.Editor })),
);
const LazyDiffer = lazy(() =>
  import("./components/cm.client").then((m) => ({ default: m.Differ })),
);

export const loader = aclLoader;
export const action = aclAction;

export default function Page({ loaderData: { access, writable, policy } }: Route.ComponentProps) {
  const [codePolicy, setCodePolicy] = useState(policy);
  const fetcher = useFetcher<typeof action>();
  const { revalidate } = useRevalidator();
  const disabled = !access || !writable; // Disable if no permission or not writable

  useEffect(() => {
    // Update the codePolicy when the loader data changes
    if (policy !== codePolicy) {
      setCodePolicy(policy);
    }
  }, [policy]);

  useEffect(() => {
    if (!fetcher.data) {
      // No data yet, return
      return;
    }

    if (fetcher.data.success === true) {
      toast("策略已更新");
      revalidate();
    }
  }, [fetcher.data]);

  return (
    <div>
      {!access ? (
        <Notice title="ACL 策略受限" variant="warning">
          您没有编辑访问控制列表策略所需的权限。请联系管理员申请权限或更改 ACL 策略。
        </Notice>
      ) : !writable ? (
        <Notice title="只读 ACL 策略" variant="error">
          Headscale 配置中的 ACL 策略模式很可能设置为 <Code>file</Code>。这意味着无法通过 Web
          界面编辑 ACL 文件。要解决此问题，您需要将 Headscale 配置中的 <Code>policy.mode</Code>{" "}
          设置为 <Code>database</Code>。
        </Notice>
      ) : undefined}
      <h1 className="mb-4 text-2xl font-medium">访问控制列表（ACL）</h1>
      <p className="mb-4 max-w-prose">
        ACL 文件用于定义您网络的访问控制规则。您可以在{" "}
        <Link external styled to="https://tailscale.com/kb/1018/acls">
          Tailscale ACL 指南
        </Link>{" "}
        和{" "}
        <Link external styled to="https://headscale.net/stable/ref/acls/">
          Headscale 文档
        </Link>{" "}
        中找到有关 ACL 文件的更多信息。
      </p>
      {fetcher.data?.error !== undefined ? (
        <Notice title={fetcher.data.error.split(":")[0] ?? "错误"} variant="error">
          {fetcher.data.error.split(":").slice(1).join(": ") ?? "尝试更新 ACL 策略时发生未知错误。"}
        </Notice>
      ) : undefined}
      <Tabs className="mb-4" label="ACL 编辑器" defaultValue="edit">
        <TabsList>
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
              预览规则功能尚不可用。此功能仍在开发中，实现起来相当复杂。希望我能尽快完成它。
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
          const formData = new FormData();
          formData.append("policy", codePolicy);
          fetcher.submit(formData, { method: "PATCH" });
        }}
        variant="heavy"
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
      <div className="flex flex-col gap-4">
        <Card className="max-w-2xl" variant="flat">
          <div className="flex items-center justify-between gap-4">
            <Card.Title>ACL 策略不可用</Card.Title>
            <AlertCircle className="mb-2 h-6 w-6 text-red-500" />
          </div>
          <Card.Text>
            由于策略文件在服务器上不存在，ACL 策略当前不可用。这通常表示 Headscale 的 ACL 以{" "}
            <Code>file</Code> 模式运行，且指定的策略文件缺失。
          </Card.Text>
        </Card>
        <Card className="max-w-2xl" variant="flat">
          <Card.Text>要解决此问题，您可以采取以下两种措施：</Card.Text>
          <ul className="mt-2 ml-4 list-outside list-disc space-y-1 text-sm">
            <li>在 Headscale 配置指定的路径下创建 ACL 策略文件。</li>
            <li>
              或者，将 Headscale 的 ACL 模式切换为 <Code>database</Code> 模式，方法是更新 Headscale
              配置。这将允许 Headplane 直接通过 Web 界面管理 ACL 策略。
            </li>
          </ul>
        </Card>
      </div>
    );
  }

  return <PageError error={error} page="访问控制" />;
}
