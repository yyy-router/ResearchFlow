import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResearchEvent } from "@/lib/types";

const {
  mockClose,
  mockCreateDeepAgent,
  mockRunResearcher,
  mockRunAnalyst,
  mockRunEditor,
} = vi.hoisted(() => ({
  mockClose: vi.fn(),
  mockCreateDeepAgent: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue(undefined),
  })),
  mockRunResearcher: vi.fn(),
  mockRunAnalyst: vi.fn(),
  mockRunEditor: vi.fn(),
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

vi.mock("deepagents", () => ({
  createDeepAgent: mockCreateDeepAgent,
  FilesystemBackend: vi.fn(),
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
  traceResearchRun: vi.fn(
    async (_id: string, _topic: string, fn: () => Promise<void>) => fn()
  ),
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

describe("runResearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventsEmitted = [];
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    // Default: all mock agents succeed silently
    mockCreateDeepAgent.mockImplementation(() => ({
      invoke: vi.fn().mockResolvedValue(undefined),
    }));
    mockRunResearcher.mockResolvedValue("findings_default.md");
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

  it("阶段 1: 规划 Agent 解析子主题后推送 plan 事件", async () => {
    // Pre-populate the plan that the agent would write
    const planContent = `# 调研计划\n\n## 子研究方向\n1. AI融资规模\n2. 头部公司分析\n3. 区域对比\n\n## Todo`;
    await writeFile("test-id", "research_plan.md", planContent);

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    const planEvent = eventsEmitted.find((e) => e.type === "plan");
    expect(planEvent).toBeDefined();
    if (planEvent?.type === "plan") {
      expect(planEvent.data.todoList).toHaveLength(3);
      expect(planEvent.data.todoList[0].title).toBe("AI融资规模");
    }
  });

  it("阶段 2: 为每个子主题调度 Researcher", async () => {
    await writeFile(
      "test-id",
      "research_plan.md",
      "# plan\n## 子研究方向\n1. 方向A\n2. 方向B\n3. 方向C\n\n## Todo"
    );

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    expect(mockRunResearcher).toHaveBeenCalledTimes(3);
    expect(mockRunResearcher).toHaveBeenCalledWith(
      "方向A",
      expect.objectContaining({ bochaApiKey: "bocha-test" })
    );
  });

  it("阶段 3: 发现数字数据时触发 Analyst", async () => {
    await writeFile(
      "test-id",
      "research_plan.md",
      "# plan\n## 子研究方向\n1. 市场规模\n\n## Todo"
    );
    // Researcher "writes" findings with numbers
    await writeFile(
      "test-id",
      "findings_市场规模.md",
      "市场规模达500亿元，同比增长25%，用户数突破8000万人"
    );
    mockRunResearcher.mockResolvedValue("findings_市场规模.md");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    expect(mockRunAnalyst).toHaveBeenCalled();
  });

  it("阶段 3: 无数字数据时跳过 Analyst", async () => {
    await writeFile(
      "test-id",
      "research_plan.md",
      "# plan\n## 子研究方向\n1. 概述\n\n## Todo"
    );
    await writeFile(
      "test-id",
      "findings_概述.md",
      "这是一个纯文本概述，不包含数量信息。"
    );
    mockRunResearcher.mockResolvedValue("findings_概述.md");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    expect(mockRunAnalyst).not.toHaveBeenCalled();
  });

  it("阶段 4: 整合 findings 生成草稿", async () => {
    await writeFile(
      "test-id",
      "research_plan.md",
      "# plan\n## 子研究方向\n1. 概述\n\n## Todo"
    );
    await writeFile("test-id", "findings_概述.md", "概述内容。");
    mockRunResearcher.mockResolvedValue("findings_概述.md");
    await writeFile("test-id", "draft.md", "# 报告草稿");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    const draft = await readFile("test-id", "draft.md");
    expect(draft).toBe("# 报告草稿");
  });

  it("阶段 5 & 6: 调用 Editor 审阅并生成 final_report", async () => {
    await writeFile(
      "test-id",
      "research_plan.md",
      "# plan\n## 子研究方向\n1. 概述\n\n## Todo"
    );
    await writeFile("test-id", "findings_概述.md", "概述内容。");
    mockRunResearcher.mockResolvedValue("findings_概述.md");
    await writeFile("test-id", "draft.md", "# 草稿内容");
    await writeFile("test-id", "review_notes.md", "# 审阅意见\n无大问题");
    await writeFile("test-id", "final_report.md", "# 最终报告");
    mockRunEditor.mockResolvedValue("review_notes.md");

    const controller = new AbortController();
    await runResearch(baseConfig, controller.signal);
    await waitForBackground();

    expect(mockRunEditor).toHaveBeenCalledWith(
      "# 草稿内容",
      expect.objectContaining({ researchId: "test-id" })
    );

    const completeEvent = eventsEmitted.find((e) => e.type === "complete");
    expect(completeEvent).toBeDefined();
  });

  it("Agent 异常时推送 error 事件并关闭 stream", async () => {
    // Plan agent reads plan, but researcher fails
    await writeFile(
      "test-id",
      "research_plan.md",
      "# plan\n## 子研究方向\n1. 方向A\n\n## Todo"
    );
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
