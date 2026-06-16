import { readFile, fileExists } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await fileExists(id, "final_report.md"))) {
    return Response.json({ error: "报告不存在" }, { status: 404 });
  }

  const content = await readFile(id, "final_report.md");
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export const runtime = "nodejs";
