import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ReportViewer } from "@/components/report-viewer";
import { ReportNav } from "@/components/report-nav";
import { fileExists, readFile } from "@/lib/storage";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;

  if (!(await fileExists(id, "final_report.md"))) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-serif font-semibold mb-2">报告不存在</h1>
        <p className="text-sm text-muted-foreground mb-6">该报告可能已被删除或 ID 无效</p>
        <Link href="/" className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground text-sm font-medium transition-colors"><ArrowLeft className="w-4 h-4 mr-1" /> 返回首页</Link>
      </main>
    );
  }

  const content = await readFile(id, "final_report.md");

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="inline-flex items-center justify-center size-8 rounded-md hover:bg-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-serif font-semibold">调研报告</h1>
      </div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-20">
            <ReportNav />
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <ReportViewer content={content} />
        </div>
      </div>
    </main>
  );
}
