import { createDeepAgent, FilesystemBackend } from "deepagents";
import path from "node:path";
import { runResearcher } from "./researcher";
import { runAnalyst } from "./analyst";
import { runEditor } from "./editor";
import { createBochaSearchTool } from "./tools/bocha-search";
import { createSSEStream } from "@/lib/sse";
import {
  createResearchDir,
  writeFile,
  readFile,
  listFiles,
} from "@/lib/storage";
import type { ResearchConfig, ResearchPlan, TodoItem, AgentConfig } from "@/lib/types";
import { traceResearchRun } from "@/lib/tracing";
import { resolveModel } from "@/lib/llm";
import { randomUUID } from "node:crypto";

export async function runResearch(
  config: ResearchConfig,
  signal: AbortSignal
) {
  const id = randomUUID();
  const { stream, emit, close } = createSSEStream(signal);
  await createResearchDir(id);

  (async () => {
    try {
      await traceResearchRun(id, config.topic, async () => {
      const agentConfig: AgentConfig = {
        llmApiKey: config.llmApiKey,
        llmProvider: config.llmProvider,
        researchId: id,
      };

      const backend = new FilesystemBackend({
        rootDir: path.join(process.cwd(), "data", `research-${id}`),
      });

      // — Phase 1: Plan —
      const searchTool = createBochaSearchTool(config.bochaApiKey);
      const planAgent = createDeepAgent({
        model: resolveModel(agentConfig),
        tools: [searchTool],
        backend,
        systemPrompt: `你是一个调研规划专家。给定一个调研主题，你需要：
1. 拆解主题为 3-6 个独立的子研究方向
2. 为每个子方向创建一个 Todo 项
3. 生成调研计划

使用 write_file 工具将计划写入 research_plan.md。

## 计划格式
\`\`\`markdown
# 调研计划：{topic}

## 子研究方向
1. {子主题1}
2. {子主题2}
...

## Todo
- [ ] {子主题1}
- [ ] {子主题2}
...
\`\`\``,
      });

      await planAgent.invoke({
        messages: [
          {
            role: "user",
            content: `请为以下调研主题制定计划：**${config.topic}**

先使用 bocha_web_search 快速了解该主题的概况，然后拆解为 3-6 个聚焦的子研究方向。

将计划写入 research_plan.md`,
          },
        ],
      });

      const planContent = await readFile(id, "research_plan.md");

      const subtopicMatches = planContent.matchAll(/^\d+\.\s+(.+)$/gm);
      const subtopics = Array.from(subtopicMatches, (m) => m[1]);
      const todoItems: TodoItem[] = subtopics.map((s, i) => ({
        id: `todo-${i}`,
        title: s,
        status: "pending",
      }));

      const plan: ResearchPlan = { topic: config.topic, todoList: todoItems };
      await emit({ type: "plan", data: plan });

      // — Phase 2: Research —
      const researcherConfig = {
        bochaApiKey: config.bochaApiKey,
        llmApiKey: config.llmApiKey,
        llmProvider: config.llmProvider,
        researchId: id,
      };

      const findingFiles: string[] = [];

      for (let i = 0; i < subtopics.length; i++) {
        const subtopic = subtopics[i];
        await emit({ type: "research_start", data: { subtopic } });
        await emit({
          type: "research_progress",
          data: { subtopic, snippet: "正在搜索..." },
        });

        const filename = await runResearcher(subtopic, researcherConfig);
        findingFiles.push(filename);

        todoItems[i].status = "completed";
        await emit({ type: "research_done", data: { subtopic } });
      }

      // — Phase 3: Analysis —
      const allFindings = await Promise.all(
        findingFiles.map(async (f) => readFile(id, f))
      );
      const combinedFindings = allFindings.join("\n");

      const analysisDecision = combinedFindings.match(
        /\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:亿|万|%|元|美元|人|个)/g
      );

      if (analysisDecision && analysisDecision.length >= 3) {
        await emit({ type: "analysis_start", data: { title: "数值分析" } });

        await runAnalyst(
          "对比分析调研中发现的各项数据指标",
          findingFiles,
          {
            llmApiKey: config.llmApiKey,
            llmProvider: config.llmProvider,
            researchId: id,
          }
        );

        const analysisFile = (await listFiles(id, "analysis_*.md"))[0];
        if (analysisFile) {
          const analysisContent = await readFile(id, analysisFile);
          await emit({
            type: "analysis_done",
            data: {
              title: "数值分析",
              code: "",
              output: "",
              conclusion: analysisContent.slice(0, 300),
            },
          });
        }
      }

      // — Phase 4: Draft —
      await emit({ type: "drafting" });

      const draftAgent = createDeepAgent({
        model: resolveModel(agentConfig),
        backend,
        systemPrompt: `你是一个报告撰写专家。根据调研发现和分析结果，撰写一份结构清晰、内容扎实的调研报告。

## 报告结构
1. 摘要（概述调研目的和核心发现）
2. 各子主题分析（每个子主题一节，含来源引用）
3. 综合分析（跨领域的关联和洞察）
4. 结论与展望

## 写作规则
- 每条重要主张必须标注来源：[来源标题](url)
- 引用多个 findings 文件中的数据和分析结果
- 语言专业但易读，面向有一定背景知识的读者
- 中文撰写`,
      });

      const files = await listFiles(id);
      const contextFiles = files
        .filter((f) => f.startsWith("findings_") || f.startsWith("analysis_"))
        .map(async (f) => ({ name: f, content: await readFile(id, f) }));

      const resolvedFiles = await Promise.all(contextFiles);
      const contextText = resolvedFiles
        .map((f) => `### ${f.name}\n\n${f.content}`)
        .join("\n\n---\n\n");

      await draftAgent.invoke({
        messages: [
          {
            role: "user",
            content: `请根据以下调研材料撰写报告草稿：

${contextText}

将草稿写入 draft.md`,
          },
        ],
      });

      const draftContent = await readFile(id, "draft.md");

      // — Phase 5: Review —
      await emit({ type: "reviewing" });

      await runEditor(draftContent, {
        llmApiKey: config.llmApiKey,
        llmProvider: config.llmProvider,
        researchId: id,
      });

      // — Phase 6: Finalize —
      await emit({ type: "finalizing" });

      const reviewContent = await readFile(id, "review_notes.md");

      const finalAgent = createDeepAgent({
        model: resolveModel(agentConfig),
        backend,
        systemPrompt: `你是一个报告定稿专家。根据编辑的审阅意见，对报告草稿进行修订。

## 规则
- 逐条处理审阅意见中的每一条建议
- 对 high 严重度的建议必须采纳修改
- 对 medium/low 建议选择性采纳，不合理的可以驳回并说明理由
- 修改后使用 write_file 将最终报告写入 final_report.md
- 格式保持 Markdown，标题层级清晰`,
      });

      await finalAgent.invoke({
        messages: [
          {
            role: "user",
            content: `报告草稿：

${draftContent}

编辑审阅意见：

${reviewContent}

请根据审阅意见修订草稿，将最终报告写入 final_report.md`,
          },
        ],
      });

      await emit({
        type: "complete",
        data: { reportUrl: `/api/report/${id}` },
      });
      }); // end traceResearchRun
    } catch (error) {
      await emit({
        type: "error",
        data: {
          message: error instanceof Error ? error.message : "未知错误",
        },
      });
    } finally {
      await close();
    }
  })();

  return { id, stream };
}
