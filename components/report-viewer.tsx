"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";

/** Module-level constant — avoids new object reference on every render for React.memo */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MARKDOWN_COMPONENTS: any = {
  h1: ({ children, ...props }: Record<string, unknown>) => (
    <h1 className="text-2xl font-serif font-bold mt-8 mb-4" {...props}>{children as React.ReactNode}</h1>
  ),
  h2: ({ children, ...props }: Record<string, unknown>) => (
    <h2 className="text-xl font-serif font-semibold mt-6 mb-3" {...props}>{children as React.ReactNode}</h2>
  ),
  h3: ({ children, ...props }: Record<string, unknown>) => (
    <h3 className="text-lg font-medium mt-4 mb-2" {...props}>{children as React.ReactNode}</h3>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="text-[#C41E3A] hover:underline">
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-border text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-border px-3 py-2 bg-muted font-medium text-left">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-border px-3 py-2">{children}</td>
  ),
};

/**
 * Split markdown content at `## ` (h2) boundaries.
 * - Intro: everything before the first `## ` heading
 * - Sections: each `## ` block (heading + its content)
 */
function splitMarkdown(content: string): { intro: string; sections: string[] } {
  const parts = content.split(/^(?=## )/m);
  const firstIsSection = parts[0]?.startsWith("## ");
  return {
    intro: firstIsSection ? "" : parts[0] || "",
    sections: firstIsSection ? parts : parts.slice(1),
  };
}

interface SectionProps {
  content: string;
}

/**
 * Memoized markdown section.
 * Only re-renders when `content` changes — prevents re-processing
 * unchanged sections when the parent re-renders.
 */
const MarkdownSection = memo(function MarkdownSection({ content }: SectionProps) {
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

interface ReportViewerProps {
  content: string;
}

export function ReportViewer({ content }: ReportViewerProps) {
  const { intro, sections } = useMemo(() => splitMarkdown(content), [content]);

  return (
    <article className="prose prose-zinc dark:prose-invert max-w-none font-serif">
      {/* Intro section — rendered immediately, above the fold */}
      {intro && <MarkdownSection content={intro} />}

      {/* Body sections — each wrapped with content-visibility: auto;
           the browser skips layout/paint for off-screen sections */}
      {sections.map((sectionContent, i) => (
        <section key={i} className="report-section">
          <MarkdownSection content={sectionContent} />
        </section>
      ))}
    </article>
  );
}
