import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";

interface ReportViewerProps {
  content: string;
}

export function ReportViewer({ content }: ReportViewerProps) {
  return (
    <article className="prose prose-zinc dark:prose-invert max-w-none font-serif">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSlug]}
        components={{
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-serif font-bold mt-8 mb-4" {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-xl font-serif font-semibold mt-6 mb-3" {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-lg font-medium mt-4 mb-2" {...props}>{children}</h3>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
               className="text-[#C41E3A] hover:underline">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-border text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 bg-muted font-medium text-left">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2">{children}</td>
          ),
        }}
      />
    </article>
  );
}
