"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { FileText, Loader2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MARKDOWN_COMPONENTS: any = {
  h1: ({ children, ...props }: Record<string, unknown>) => (
    <h1 className="text-2xl font-serif font-bold mt-6 mb-3" {...props}>{children as React.ReactNode}</h1>
  ),
  h2: ({ children, ...props }: Record<string, unknown>) => (
    <h2 className="text-xl font-serif font-semibold mt-5 mb-2" {...props}>{children as React.ReactNode}</h2>
  ),
  h3: ({ children, ...props }: Record<string, unknown>) => (
    <h3 className="text-lg font-medium mt-3 mb-1.5" {...props}>{children as React.ReactNode}</h3>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="text-[#C41E3A] hover:underline">
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border-collapse border border-border text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-border px-2 py-1.5 bg-muted font-medium text-left">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-border px-2 py-1.5">{children}</td>
  ),
};

const MemoMarkdown = memo(function MemoMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight, rehypeSlug]}
      components={MARKDOWN_COMPONENTS}
    >
      {content}
    </ReactMarkdown>
  );
});

interface StreamingReportProps {
  content: string;
  currentPhase: string | null;
}

function getPhaseLabel(phase: string | null): string | null {
  if (!phase) return null;
  switch (phase) {
    case "finalizing": return "报告定稿中...";
    case "assembly":   return "汇总校验中...";
    default:           return null;
  }
}

export function StreamingReport({ content, currentPhase }: StreamingReportProps) {
  if (!content) return null;

  const label = getPhaseLabel(currentPhase);
  const showSpinner = currentPhase === "finalizing" || currentPhase === "assembly";

  return (
    <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {label && (
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              {showSpinner && <Loader2 className="w-3 h-3 animate-spin" />}
              {label}
            </span>
          </span>
        </div>
      )}
      <div className="rounded-lg border bg-card p-4 max-h-[70vh] overflow-y-auto">
        <article className="prose prose-zinc dark:prose-invert max-w-none font-serif text-sm leading-relaxed">
          <MemoMarkdown content={content} />
        </article>
      </div>
    </div>
  );
}
