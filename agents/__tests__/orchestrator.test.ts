import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResearchEvent } from "@/lib/types";

const {
  mockClose,
  mockRunResearcher,
  mockRunAnalyst,
  mockRunEditor,
  mockCreatePlanAgent,
  mockCreateDraftAgent,
  mockCreateFinalizeAgent,
} = vi.hoisted(() => ({
  mockClose: vi.fn(),
  mockRunResearcher: vi.fn(),
  mockRunAnalyst: vi.fn(),
  mockRunEditor: vi.fn(),
  mockCreatePlanAgent: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue(undefined),
  })),
  mockCreateDraftAgent: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue(undefined),
  })),
  mockCreateFinalizeAgent: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue(undefined),
  })),
}));

let eventsEmitted: ResearchEvent[] = [];

vi.mock("@/lib/sse", () => ({
  createSSEStream: vi.fn(() => ({
    stream: new ReadableStream(),
    emit: vi.fn(async (event: ResearchEvent) => {
      eventsEmitted.push(event);
    }),
    close: mockClose,
  })),
}));

const storageData: Record<string, string> = {};

vi.mock("@/lib/storage", () => ({
  createResearchDir: vi.fn(),
  writeFile: vi.fn(async (_id: string, filename: string, content: string) => {
    storageData[filename] = content;
  }),
  readFile: vi.fn(async (_id: string, filename: string) => {
    const content = storageData[filename];
    if (content === undefined) throw new Error(`File not found: ${filename}`);
    return content;
  }),
  listFiles: vi.fn(async () => Object.keys(storageData)),
  fileExists: vi.fn(async (_id: string, filename: string) => filename in storageData),
}));

vi.mock("@/lib/agent", () => ({
  createPlanAgent: mockCreatePlanAgent,
  createDraftAgent: mockCreateDraftAgent,
  createFinalizeAgent: mockCreateFinalizeAgent,
  createWriteFileTool: vi.fn(),
  createReadFileTool: vi.fn(),
  createListFilesTool: vi.fn(),
}));

vi.mock("../researcher", () => ({
  runResearcher: mockRunResearcher,
}));

vi.mock("../analyst", () => ({
  runAnalyst: mockRunAnalyst,
}));

vi.mock("../editor", () => ({
  runEditor: mockRunEditor,
}));

vi.mock("../tools/bocha-search", () => ({
  createBochaSearchTool: vi.fn(() => ({ name: "bocha_web_search" })),
}));

vi.mock("@/lib/tracing", () => ({
  getCallbacks: vi.fn(() => []),
  withSpan: vi.fn(async (_name: string, fn: () => Promise<void>) => fn()),
}));

vi.mock("@/lib/llm", () => ({
  resolveModel: vi.fn(() => "claude-sonnet-4-5-20250929"),
}));

vi.mock("node:crypto", () => ({
  randomUUID: vi.fn(() => "test-id"),
}));

import { runResearch } from "../orchestrator";
import { readFile, writeFile } from "@/lib/storage";

const baseConfig = {
  llmApiKey: "sk-test",
  llmProvider: "deepseek" as const,
  bochaApiKey: "bocha-test",
  topic: "2024年AI行业融资趋势",
};

function planWithSlugs(subtopics: { slug: string; title: string }[]) {
  const lines = subtopics.map((s, i) => `${i + 1}. [${s.slug}] ${s.title}`);
  return `# 调研计划\n\n## 子研究方向\n${lines.join("\n")}\n\n## Todo`;
}

// Plain numbered list (fallback) → generates topic-N slugs
function planPlain(titles: string[]) {
  return `# plan\n## 子研究方向\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n## Todo`;
}

describe("runResearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventsEmitted = [];
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    mockCreatePlanAgent.mockImplementation(() => ({
      invoke: vi.fn().mockResolvedValue(undefined),
    }));
    mockCreateDraftAgent.mockImplementation(() => ({
      invoke: vi.fn().mockResolvedValue(undefined),
    }));
    mockCreateFinalizeAgent.mockImplementation(() => ({
      invoke: vi.fn().mockResolvedValue(undefined),
    }));
    mockRunResearcher.mockImplementation(
      async (_subtopic: string, filename: string) => filename
    );
  });

  async function waitForBackground() {
    await new Promise((r) => setTimeout(r, 100));
  }

  it("返回 id 和 stream", async () => {
    const controller = new AbortController();
    const { id, stream } = await runResearch(baseConfig, controller.signal);
    expect(id).toBe("test-id");
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it("阶段 1: 解析 [slug] 格式计划并推送 plan 事件", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "ai-funding", title: "AI融资规模" },
      { slug: "company-analysis", title: "头部公司分析" },
      { slug: "region-comparison", title: "区域对比" },
    ]));

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    const planEvent = eventsEmitted.find((e) => e.type === "plan");
    expect(planEvent).toBeDefined();
    if (planEvent?.type === "plan") {
      expect(planEvent.data.todoList).toHaveLength(3);
      expect(planEvent.data.todoList[0].title).toBe("[ai-funding] AI融资规模");
    }
  });

  it("阶段 1 fallback: 无 slug 时自动生成 topic-N", async () => {
    await writeFile("test-id", "research_plan.md", planPlain(["AI融资规模", "头部公司分析"]));

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    const planEvent = eventsEmitted.find((e) => e.type === "plan");
    if (planEvent?.type === "plan") {
      expect(planEvent.data.todoList[0].title).toBe("[topic-1] AI融资规模");
    }
  });

  it("阶段 2: 使用 semantic 文件名调度 Researcher", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "dir-a", title: "方向A" },
      { slug: "dir-b", title: "方向B" },
      { slug: "dir-c", title: "方向C" },
    ]));

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    expect(mockRunResearcher).toHaveBeenCalledTimes(3);
    expect(mockRunResearcher).toHaveBeenCalledWith(
      "方向A",
      "finding_dir-a.md",
      expect.objectContaining({ bochaApiKey: "bocha-test" })
    );
  });

  it("阶段 3: 发现数字数据时触发 Analyst", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "market-size", title: "市场规模" },
    ]));
    await writeFile("test-id", "finding_market-size.md", "市场规模达500亿元，同比增长25%，用户数突破8000万人");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    expect(mockRunAnalyst).toHaveBeenCalled();
  });

  it("阶段 3: 无数字数据时跳过 Analyst", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "overview", title: "概述" },
    ]));
    await writeFile("test-id", "finding_overview.md", "无数量信息的纯文本概述。");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    expect(mockRunAnalyst).not.toHaveBeenCalled();
  });

  it("阶段 4: Draft agent 自行读取并生成草稿", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "overview", title: "概述" },
    ]));
    await writeFile("test-id", "finding_overview.md", "概述内容。");
    await writeFile("test-id", "draft.md", "# 报告草稿");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    const draft = await readFile("test-id", "draft.md");
    expect(draft).toBe("# 报告草稿");
  });

  it("阶段 5 & 6: 调用 Editor 并生成 final_report", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "overview", title: "概述" },
    ]));
    await writeFile("test-id", "finding_overview.md", "概述内容。");
    await writeFile("test-id", "draft.md", "# 草稿内容");
    await writeFile("test-id", "review_notes.md", "# 审阅意见\n无大问题");
    await writeFile("test-id", "final_report.md", "# 最终报告");
    mockRunEditor.mockResolvedValue("review_notes.md");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    expect(mockRunEditor).toHaveBeenCalledWith(
      "# 草稿内容",
      "review_notes.md",
      expect.objectContaining({ researchId: "test-id" })
    );

    const completeEvent = eventsEmitted.find((e) => e.type === "complete");
    expect(completeEvent).toBeDefined();
  });

  it("Agent 异常时推送 error 事件并关闭 stream", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "dir-a", title: "方向A" },
    ]));
    mockRunResearcher.mockRejectedValue(new Error("搜索服务不可用"));

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    expect(mockClose).toHaveBeenCalled();
    const errorEvent = eventsEmitted.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    if (errorEvent?.type === "error") {
      expect(errorEvent.data.message).toContain("搜索服务不可用");
    }
  });
});
