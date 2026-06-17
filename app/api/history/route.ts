import { listResearchDirs } from "@/lib/storage";

export async function GET() {
  const records = await listResearchDirs();
  return Response.json(records);
}
