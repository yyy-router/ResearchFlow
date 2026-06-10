import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createResearchDir,
  writeFile,
  readFile,
  listFiles,
  fileExists,
} from "../storage";
import fs from "node:fs/promises";
import path from "node:path";

const testId = "test-" + Date.now();
const testDir = path.join(process.cwd(), "data", `research-${testId}`);

beforeAll(async () => {
  await createResearchDir(testId);
});

afterAll(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

describe("storage", () => {
  it("writeFile 写入文件并返回路径", async () => {
    const filepath = await writeFile(testId, "test.md", "# Hello");
    expect(filepath).toContain(testId);
    expect(filepath).toContain("test.md");

    const content = await fs.readFile(filepath, "utf-8");
    expect(content).toBe("# Hello");
  });

  it("readFile 读取已写入的文件", async () => {
    await writeFile(testId, "readme.md", "content");
    const content = await readFile(testId, "readme.md");
    expect(content).toBe("content");
  });

  it("fileExists 对存在的文件返回 true", async () => {
    await writeFile(testId, "exists.md", "ok");
    expect(await fileExists(testId, "exists.md")).toBe(true);
  });

  it("fileExists 对不存在的文件返回 false", async () => {
    expect(await fileExists(testId, "nonexistent.md")).toBe(false);
  });

  it("listFiles 列出目录内所有文件", async () => {
    await writeFile(testId, "a.md", "a");
    await writeFile(testId, "b.md", "b");

    const files = await listFiles(testId);
    expect(files).toEqual(
      expect.arrayContaining(["a.md", "b.md"])
    );
  });

  it("listFiles 支持通配符过滤", async () => {
    await writeFile(testId, "findings_foo.md", "f");
    await writeFile(testId, "analysis_bar.md", "a");

    const findings = await listFiles(testId, "findings_*.md");
    expect(findings).toEqual(["findings_foo.md"]);
  });
});
