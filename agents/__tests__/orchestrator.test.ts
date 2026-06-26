import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResearchEvent } from "@/lib/types";

const {
  mockClose,
  mockRunResearcher,
  mockRunAnalyst,
  mockRunEditor,
  mockGeneratePlan,
  mockCreatePlanAgent,
  mockCreateDraftAgent,
  mockCreateFinalizeAgent,
  mockCreateSectionFinalizeAgent,
  mockCreateAssemblyAgent,
} = vi.hoisted(() => ({
  mockClose: vi.fn(),
  mockRunResearcher: vi.fn(),
  mockRunAnalyst: vi.fn(),
  mockRunEditor: vi.fn(),
  mockGeneratePlan: vi.fn(async (_config: unknown, _topic: string) => {
    return storageData["research_plan.md"] || "# 调研计划：测试\n\n## 子研究方向\n1. [overview] 概述\n\n## Todo\n- [ ] [overview] 概述\n";
  }),
  mockCreatePlanAgent: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue(undefined),
  })),
  mockCreateDraftAgent: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue(undefined),
  })),
  mockCreateFinalizeAgent: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue(undefined),
  })),
  mockCreateSectionFinalizeAgent: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue(undefined),
  })),
  mockCreateAssemblyAgent: vi.fn(() => ({
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
  generatePlan: mockGeneratePlan,
  createPlanAgent: mockCreatePlanAgent,
  createDraftAgent: mockCreateDraftAgent,
  createFinalizeAgent: mockCreateFinalizeAgent,
  createSectionFinalizeAgent: mockCreateSectionFinalizeAgent,
  createAssemblyAgent: mockCreateAssemblyAgent,
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

// 防止真实 @opentelemetry/api 加载干扰 vitest 内部 OTel 状态
vi.mock("@opentelemetry/api", () => ({
  context: { active: vi.fn(() => ({})), with: vi.fn((_ctx: unknown, fn: () => unknown) => fn()) },
  trace: { getTracer: vi.fn(() => ({ startSpan: vi.fn(() => ({ end: vi.fn() })) })) },
}));

vi.mock("node:crypto", () => ({
  default: { randomUUID: vi.fn(() => "test-id") },
  randomUUID: vi.fn(() => "test-id"),
}));

import { runResearch } from "../orchestrator";
import { readFile, writeFile } from "@/lib/storage";

const baseConfig = {
  llmApiKey: "sk-test",
  llmProvider: "openai" as const,
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
    mockCreateSectionFinalizeAgent.mockImplementation(() => ({
      invoke: vi.fn().mockResolvedValue(undefined),
    }));
    mockCreateAssemblyAgent.mockImplementation(() => ({
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
      expect.objectContaining({ bochaApiKey: "bocha-test" }),
      expect.any(Function)
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

  it("阶段 4-6: 已存在的中间文件被跳过，定稿后生成 complete", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "overview", title: "概述" },
    ]));
    await writeFile("test-id", "finding_overview.md", "概述内容。");
    await writeFile("test-id", "draft.md", "# 草稿内容");
    await writeFile("test-id", "review_notes.md", "# 审阅意见\n无大问题");
    mockRunEditor.mockResolvedValue("review_notes.md");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    // Phases 1-5 all skip (files exist), only Phase 6 runs
    expect(mockCreateDraftAgent).not.toHaveBeenCalled();
    expect(mockRunEditor).not.toHaveBeenCalled();
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

  it("阶段 2: 多个子方向时全部并发执行", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "dir-a", title: "方向A" },
      { slug: "dir-b", title: "方向B" },
      { slug: "dir-c", title: "方向C" },
    ]));

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    // All 3 subtopics researched
    expect(mockRunResearcher).toHaveBeenCalledTimes(3);
    // All research_start events fired
    const startEvents = eventsEmitted.filter((e) => e.type === "research_start");
    expect(startEvents).toHaveLength(3);
    // All research_done events fired
    const doneEvents = eventsEmitted.filter((e) => e.type === "research_done");
    expect(doneEvents).toHaveLength(3);
  });

  it("阶段 2: 传递 runResearch 预定义 subtopics 跳过 Phase 1", async () => {
    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal, [
      { slug: "custom-a", title: "自定义A" },
      { slug: "custom-b", title: "自定义B" },
    ]);
    await waitForBackground();

    // Used provided subtopics, did not call plan generation
    expect(mockGeneratePlan).not.toHaveBeenCalled();
    expect(mockRunResearcher).toHaveBeenCalledTimes(2);
    expect(mockRunResearcher).toHaveBeenCalledWith(
      "自定义A", "finding_custom-a.md", expect.anything(), expect.any(Function)
    );
  });

  it("阶段 6: 单章节草稿退化为原有单次定稿调用", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "overview", title: "概述" },
    ]));
    await writeFile("test-id", "finding_overview.md", "概述内容。");
    await writeFile("test-id", "draft.md", "# 报告标题\n\n无二级标题的简单草稿。");
    await writeFile("test-id", "review_notes.md", "# 审阅意见\n无大问题");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    // 单章节应使用原始 createFinalizeAgent（退化路径）
    expect(mockCreateFinalizeAgent).toHaveBeenCalled();
    // 不应启动分段定稿
    expect(mockCreateSectionFinalizeAgent).not.toHaveBeenCalled();
    expect(mockCreateAssemblyAgent).not.toHaveBeenCalled();
  });

  it("阶段 6: 多章节草稿触发分段定稿 + 汇总校验", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "overview", title: "概述" },
    ]));
    await writeFile("test-id", "finding_overview.md", "概述内容。");
    // Multi-section draft (no intro — starts directly with ##)
    await writeFile("test-id", "draft.md", [
      "## 市场分析",
      "市场分析内容。",
      "",
      "## 竞品对比",
      "竞品对比内容。",
    ].join("\n"));
    await writeFile("test-id", "review_notes.md", "# 审阅意见\n需补充数据");
    // Pre-populate the finalized part files (mock invoke doesn't call writeFile)
    await writeFile("test-id", "final_part_0.md", "## 市场分析\n修订后。");
    await writeFile("test-id", "final_part_1.md", "## 竞品对比\n修订后。");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    // 多章节应使用分段定稿
    expect(mockCreateFinalizeAgent).not.toHaveBeenCalled();
    // 2 个 h2 section → 2 个 section finalize agents (no intro)
    expect(mockCreateSectionFinalizeAgent).toHaveBeenCalledTimes(2);
    // 汇总 agent
    expect(mockCreateAssemblyAgent).toHaveBeenCalledTimes(1);
    // 应发出 assembly_start 事件
    const assemblyEvent = eventsEmitted.find((e) => e.type === "assembly_start");
    expect(assemblyEvent).toBeDefined();
  });

  it("阶段 6: 有引言的草稿同时定稿引言和各章节", async () => {
    await writeFile("test-id", "research_plan.md", planWithSlugs([
      { slug: "overview", title: "概述" },
    ]));
    await writeFile("test-id", "finding_overview.md", "概述内容。");
    // Draft with intro (content before first ##) + 2 h2 sections
    await writeFile("test-id", "draft.md", [
      "# 报告标题",
      "",
      "这是引言，位于第一个二级标题之前。",
      "",
      "## 市场分析",
      "市场分析内容。",
      "",
      "## 竞品对比",
      "竞品对比内容。",
    ].join("\n"));
    await writeFile("test-id", "review_notes.md", "# 审阅意见\n整体良好");
    // Pre-populate finalized part files
    await writeFile("test-id", "final_part_intro.md", "# 报告标题\n修订引言。");
    await writeFile("test-id", "final_part_0.md", "## 市场分析\n修订后。");
    await writeFile("test-id", "final_part_1.md", "## 竞品对比\n修订后。");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    // 引言 + 2 h2 sections = 3 section finalize agents
    expect(mockCreateSectionFinalizeAgent).toHaveBeenCalledTimes(3);
    // 应包含 intro 块 (final_part_intro.md)
    const introCall = mockCreateSectionFinalizeAgent.mock.calls.find(
      (call: unknown[]) => (call[1] as { outputFile: string }).outputFile === "final_part_intro.md"
    );
    expect(introCall).toBeDefined();
    expect(mockCreateAssemblyAgent).toHaveBeenCalledTimes(1);
  });
});
