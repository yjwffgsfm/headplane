import { CircleAlert, Lock, SearchX, ServerOff } from "lucide-react";
import type React from "react";
import { useRevalidator } from "react-router";

import cn from "~/utils/cn";
import { describeError, type ErrorInfo } from "~/utils/describe-error";

import Button from "./button";
import Link from "./link";

const icons: Record<ErrorInfo["kind"], typeof CircleAlert> = {
  connection: ServerOff,
  forbidden: Lock,
  not_found: SearchX,
  headscale: CircleAlert,
  unknown: CircleAlert,
};

interface Props {
  error: unknown;
  page?: string;
}

export default function PageError({ error, page = "此页面" }: Props) {
  const { revalidate, state } = useRevalidator();
  const info = describeError(error);
  const Icon = icons[info.kind];

  // Latin page names need a space between the Chinese verb and the name.
  const pageName = /^[A-Za-z]/.test(page) ? ` ${page}` : page;

  const title =
    info.kind === "connection"
      ? `无法加载${pageName}`
      : info.kind === "forbidden"
        ? `无权访问${pageName}`
        : info.title;

  const description =
    info.kind === "connection"
      ? "此页面需要 Headscale 才能加载。待其恢复后请重试。"
      : info.description;

  const canRetry = info.kind !== "forbidden" && info.kind !== "not_found";

  return (
    <ErrorState description={description} icon={<Icon />} title={title}>
      {(canRetry || info.kind === "unknown") && (
        <div className="mt-6 flex items-center gap-4">
          {canRetry && (
            <Button onClick={() => revalidate()} pending={state === "loading"}>
              重试
            </Button>
          )}
          {info.kind === "unknown" && <ReportLink />}
        </div>
      )}
      {info.details && <ErrorDetails className="[&>summary]:mx-auto" details={info.details} />}
    </ErrorState>
  );
}

interface ErrorStateProps {
  icon: React.ReactElement;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

export function ErrorState({ icon, title, description, children }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <span className="text-muted [&>svg]:size-8">{icon}</span>
      <h2 className="mt-4 text-lg font-semibold text-balance">{title}</h2>
      {description && <p className="text-muted mt-1 max-w-md text-balance">{description}</p>}
      {children}
    </div>
  );
}

export function ErrorDetails({ details, className }: { details: string; className?: string }) {
  return (
    <details className={cn("mt-6 w-full max-w-lg text-left", className)}>
      <summary className="text-muted hover:text-fg w-fit cursor-pointer text-sm">详情</summary>
      <pre className="bg-subtle mt-2 overflow-x-auto rounded-md p-3 font-mono text-xs break-all whitespace-pre-wrap">
        {details}
      </pre>
    </details>
  );
}

export function ReportLink() {
  return (
    <Link external styled to="https://github.com/tale/headplane/issues/new">
      报告问题
    </Link>
  );
}
