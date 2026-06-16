import { runResearcher } from "./researcher";
import { runAnalyst } from "./analyst";
import { runEditor } from "./editor";
import { createSSEStream } from "@/lib/sse";
import { createResearchDir, readFile } from "@/lib/storage";
import type { ResearchConfig, TodoItem, SubtopicEntry, AgentConfig } from "@/lib/types";
import { getCallbacks, withSpan } from "@/lib/tracing";
import { createPlanAgent, createDraftAgent, createFinalizeAgent } from "@/lib/agent";
import { randomUUID } from "node:crypto";

export async function runResearch(config: ResearchConfig, signal: AbortSignal) {
  const id = randomUUID();
  const { stream, emit, close } = createSSEStream(signal);
  await createResearchDir(id);

  (async () => {
    try {
      await withSpan(config.topic, async () => {
      const agentConfig: AgentConfig = {
        llmApiKey: config.llmApiKey,
        llmProvider: config.llmProvider,
        researchId: id,
      };
      const callbacks = getCallbacks();

      // — Phase 1: Plan —
      await withSpan("Phase 1: Plan", async () => {
        const planAgent = createPlanAgent(agentConfig);
        await planAgent.invoke(
          {
            messages: [
              {
                role: "user",
                content: `为调研主题制定计划，拆解为 3-6 个聚焦的子研究方向。\n\n调研主题：${config.topic}`,
              },
            ],
          },
          { callbacks, recursionLimit: 30 }
        );
      });

      const planContent = await readFile(id, "research_plan.md");

      // Parse [slug] Title format
      const slugRegex = /^\d+\.\s+\[([a-z0-9-]+)\]\s+(.+)$/mgi;
      const subtopics: SubtopicEntry[] = [];
      for (const m of planContent.matchAll(slugRegex)) {
        subtopics.push({ slug: m[1], title: m[2].trim() });
      }
      if (subtopics.length === 0) {
        let i = 1;
        for (const m of planContent.matchAll(/^\d+\.\s+(.+)$/gm)) {
          subtopics.push({ slug: `topic-${i++}`, title: m[1].replace(/\*{1,3}/g, "").trim() });
        }
      }

      const todoItems: TodoItem[] = subtopics.map((s, i) => ({
        id: `todo-${i}`,
        title: `[${s.slug}] ${s.title}`,
        status: "pending",
      }));
      await emit({ type: "plan", data: { topic: config.topic, todoList: todoItems } });

      // — Phase 2: Research —
      const researcherConfig = {
        bochaApiKey: config.bochaApiKey,
        llmApiKey: config.llmApiKey,
        llmProvider: config.llmProvider,
        researchId: id,
      };
      const findingFiles: string[] = [];

      for (let i = 0; i < subtopics.length; i++) {
        const { slug, title } = subtopics[i];
        const filename = `finding_${slug}.md`;
        await withSpan(`Research: ${slug}`, async () => {
          await emit({ type: "research_start", data: { subtopic: title } });
          await emit({ type: "research_progress", data: { subtopic: title, snippet: "正在搜索..." } });
          await runResearcher(title, filename, researcherConfig);
          findingFiles.push(filename);
          todoItems[i].status = "completed";
          await emit({ type: "research_done", data: { subtopic: title } });
        });
      }

      // — Phase 3: Analysis —
      const allFindings = await Promise.all(findingFiles.map((f) => readFile(id, f)));
      const combinedFindings = allFindings.join("\n");
      const hasNumbers = combinedFindings.match(
        /\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:亿|万|%|元|美元|人|个)/g
      );

      if (hasNumbers && hasNumbers.length >= 3) {
        await withSpan("Phase 3: Analysis", async () => {
          await emit({ type: "analysis_start", data: { title: "数值分析" } });
          await runAnalyst("对比分析调研发现的各项数据指标", "analysis_1.md", findingFiles, {
            llmApiKey: config.llmApiKey,
            llmProvider: config.llmProvider,
            researchId: id,
          });
        });
        const analysisContent = await readFile(id, "analysis_1.md");
        await emit({
          type: "analysis_done",
          data: { title: "数值分析", code: "", output: "", conclusion: analysisContent.slice(0, 300) },
        });
      }

      // — Phase 4: Draft —
      await emit({ type: "drafting" });
      await withSpan("Phase 4: Draft", async () => {
        const draftAgent = createDraftAgent(agentConfig);
        await draftAgent.invoke(
          {
            messages: [
              {
                role: "user",
                content: `撰写调研报告草稿。先浏览工作区文件了解调研结果，再整合撰写，写入 draft.md。\n\n调研主题：${config.topic}`,
              },
            ],
          },
          { callbacks, recursionLimit: 50 }
        );
      });
      const draftContent = await readFile(id, "draft.md");

      // — Phase 5: Review —
      await emit({ type: "reviewing" });
      await withSpan("Phase 5: Review", async () => {
        await runEditor(draftContent, "review_notes.md", {
          llmApiKey: config.llmApiKey,
          llmProvider: config.llmProvider,
          researchId: id,
        });
      });

      // — Phase 6: Finalize —
      await emit({ type: "finalizing" });
      await withSpan("Phase 6: Finalize", async () => {
        const reviewContent = await readFile(id, "review_notes.md");
        const finalAgent = createFinalizeAgent(agentConfig);
        await finalAgent.invoke(
          {
            messages: [
              {
                role: "user",
                content: `根据审阅意见修订草稿，写入 final_report.md。\n\n## 草稿\n\n${draftContent}\n\n## 审阅意见\n\n${reviewContent}`,
              },
            ],
          },
          { callbacks, recursionLimit: 30 }
        );
      });

      await emit({ type: "complete", data: { reportUrl: `/api/report/${id}` } });
      }); // end root span
    } catch (error) {
      await emit({
        type: "error",
        data: { message: error instanceof Error ? error.message : "未知错误" },
      });
    } finally {
      await close();
    }
  })();

  return { id, stream };
}
