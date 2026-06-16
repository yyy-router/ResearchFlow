import fs from "node:fs/promises";
import path from "node:path";
import type { ResearchRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function createResearchDir(id: string): Promise<string> {
  const dir = path.join(DATA_DIR, `research-${id}`);
  await ensureDir(dir);
  return dir;
}

export async function writeFile(
  researchId: string,
  filename: string,
  content: string
): Promise<string> {
  const dir = path.join(DATA_DIR, `research-${researchId}`);
  await ensureDir(dir);
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, content, "utf-8");
  return filepath;
}

export async function readFile(
  researchId: string,
  filename: string
): Promise<string> {
  const filepath = path.join(DATA_DIR, `research-${researchId}`, filename);
  return fs.readFile(filepath, "utf-8");
}

export async function listFiles(
  researchId: string,
  pattern?: string
): Promise<string[]> {
  const dir = path.join(DATA_DIR, `research-${researchId}`);
  const files = await fs.readdir(dir);
  if (pattern) {
    const re = new RegExp(pattern.replace("*", ".*"));
    return files.filter((f) => re.test(f));
  }
  return files;
}

export async function fileExists(
  researchId: string,
  filename: string
): Promise<boolean> {
  try {
    await fs.access(path.join(DATA_DIR, `research-${researchId}`, filename));
    return true;
  } catch {
    return false;
  }
}

export async function listResearchDirs(): Promise<ResearchRecord[]> {
  await ensureDir(DATA_DIR);
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const records: ResearchRecord[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("research-")) continue;
    const id = entry.name.slice("research-".length);
    const dirPath = path.join(DATA_DIR, entry.name);

    let topic = id;
    let status: "completed" | "error" = "completed";
    let createdAt = "";

    try {
      const planPath = path.join(dirPath, "research_plan.md");
      const plan = await fs.readFile(planPath, "utf-8");
      const match = plan.match(/^#\s+(.+)$/m);
      if (match) topic = match[1].replace(/调研计划[：:]\s*/, "").trim();
    } catch {
      /* use id as topic */
    }

    try {
      const stat = await fs.stat(dirPath);
      createdAt = stat.birthtime.toISOString();
    } catch {
      createdAt = "";
    }

    try {
      await fs.access(path.join(dirPath, "final_report.md"));
    } catch {
      status = "error";
    }

    records.push({ id, topic, createdAt, status });
  }

  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return records;
}
