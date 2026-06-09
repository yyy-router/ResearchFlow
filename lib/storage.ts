import fs from "node:fs/promises";
import path from "node:path";

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
