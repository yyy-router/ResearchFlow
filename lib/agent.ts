import { createAgent } from "langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { resolveModel } from "./llm";
import { writeFile, readFile, listFiles } from "./storage";
import type { AgentConfig } from "./types";

// ── 文件 I/O 工具 ──

export function createWriteFileTool(researchId: string) {
  return tool(
    async ({ filename, content }: { filename: string; content: string }) => {
      await writeFile(researchId, filename, content);
      return `Written: ${filename}`;
    },
    {
      name: "write_file",
      description: "Write content to a file in the research workspace.",
      schema: z.object({
        filename: z.string().describe("Target filename"),
        content: z.string().describe("Content to write"),
      }),
    }
  );
}

export function createReadFileTool(researchId: string) {
  return tool(
    async ({ filename }: { filename: string }) => {
      return await readFile(researchId, filename);
    },
    {
      name: "read_file",
      description: "Read the full content of a file from the research workspace.",
      schema: z.object({
        filename: z.string().describe("Filename to read"),
      }),
    }
  );
}

export function createListFilesTool(researchId: string) {
  return tool(
    async () => {
      const files = await listFiles(researchId);
      return files.join("\n");
    },
    {
      name: "list_files",
      description: "List all files in the research workspace.",
      schema: z.object({}),
    }
  );
}

// ── Agent 工厂 ──

export function createPlanAgent(config: AgentConfig) {
  return createAgent({
    model: resolveModel(config),
    tools: [createWriteFileTool(config.researchId)],
    systemPrompt: `你是一个调研规划专家。将调研主题拆解为 3-6 个聚焦的子研究方向。

核心原则：每个子方向必须包含调研主题中的具体对象（产品名/模型名/公司名/技术名等）。子方向名的格式为：「具体对象」+「具体维度」。禁止写成没有对象的通用概念。

将结果写入 research_plan.md，格式：

\`\`\`markdown
# 调研计划：{topic}

## 子研究方向
1. [english-slug] 中文子方向名
2. [english-slug] 另一个子方向
...

## Todo
- [ ] [english-slug] 中文子方向名
...
\`\`\`

规则：
- Slug: 2-4 个英文关键词，连字符连接，语义准确
- 子方向名 = 调研对象 + 维度（如"XX产品的性能评测"而非"性能评测"）
- 常用拆分维度：功能评测、竞品对比、行业影响、技术架构、应用场景、市场数据、政策合规`,
  });
}

export function createDraftAgent(config: AgentConfig) {
  return createAgent({
    model: resolveModel(config),
    tools: [
      createListFilesTool(config.researchId),
      createReadFileTool(config.researchId),
      createWriteFileTool(config.researchId),
    ],
    systemPrompt: `你是一个报告撰写专家。先浏览工作区的调研发现和分析结果，然后撰写一份结构清晰的中文调研报告，写入 draft.md。

## 报告结构
1. 摘要
2. 各子主题分析（含来源引用）
3. 综合分析
4. 结论与展望

写作规则：每条重要主张附来源引用 [标题](url)，中文撰写。`,
  });
}

export function createFinalizeAgent(config: AgentConfig) {
  return createAgent({
    model: resolveModel(config),
    tools: [createWriteFileTool(config.researchId)],
    systemPrompt: `你是一个报告定稿专家。根据审阅意见修订草稿，将最终报告写入 final_report.md。

规则：逐条处理审阅建议，high 必须修改，medium/low 选择性采纳。Markdown 格式，标题层级清晰。`,
  });
}
