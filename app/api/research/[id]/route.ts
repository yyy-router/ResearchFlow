import fs from "node:fs/promises";
import path from "node:path";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dirPath = path.join(process.cwd(), "data", `research-${id}`);

  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "删除失败" }, { status: 404 });
  }
}
