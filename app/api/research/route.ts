import { runResearchPlan, runResearch } from "@/agents/orchestrator";
import type { ResearchConfig, SubtopicEntry } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { action, topic, llmApiKey, llmProvider, bochaApiKey, subtopics, llmBaseUrl, model, researchId } = body;

  if (!topic || !llmApiKey || !llmProvider || !bochaApiKey) {
    return Response.json({ error: "缺少必要参数" }, { status: 400 });
  }

  const config: ResearchConfig = { topic, llmApiKey, llmProvider, bochaApiKey, llmBaseUrl, model };
  const controller = new AbortController();

  const { stream } = action === "plan"
    ? await runResearchPlan(config, controller.signal)
    : await runResearch(config, controller.signal, subtopics as SubtopicEntry[], researchId);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
