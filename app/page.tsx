"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useConfig } from "@/components/config-provider";
import { ResearchForm } from "@/components/research-form";
import { PlanReview } from "@/components/plan-review";
import { ProgressPanel } from "@/components/progress-panel";
import { ErrorBanner } from "@/components/error-banner";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { parseSSELine } from "@/lib/api-helpers";
import type { ResearchEvent, TodoItem } from "@/lib/types";

type Stage = "input" | "plan" | "running" | "done";

export default function Home() {
  const router = useRouter();
  const config = useConfig();
  const [stage, setStage] = useState<Stage>("input");
  const [topic, setTopic] = useState("");
  const [planItems, setPlanItems] = useState<TodoItem[]>([]);
  const [events, setEvents] = useState<ResearchEvent[]>([]);
  const [reportId, setReportId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isRunPhaseRef = useRef(false);
  const researchIdRef = useRef<string>("");

  const consumeSSE = useCallback(async (response: Response) => {
    if (!response.ok) {
      setError(`请求失败: ${response.status}`);
      setStage("input");
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseSSELine(line);
        if (!event) continue;

        setEvents((prev) => [...prev, event]);

        switch (event.type) {
          case "plan":
            setPlanItems(event.data.todoList);
            setTopic(event.data.topic);
            researchIdRef.current = event.data.researchId;
            if (!isRunPhaseRef.current) setStage("plan");
            break;
          case "research_start":
            setCurrentPhase("research");
            break;
          case "analysis_start":
            setCurrentPhase("analysis");
            break;
          case "drafting":
            setCurrentPhase("drafting");
            break;
          case "reviewing":
            setCurrentPhase("reviewing");
            break;
          case "finalizing":
            setCurrentPhase("finalizing");
            break;
          case "complete":
            setCurrentPhase(null);
            setReportId(event.data.reportUrl.split("/").pop() ?? "");
            setStage("done");
            break;
          case "error":
            setError(event.data.message);
            break;
        }
      }
    }
  }, []);

  const handleStart = useCallback(async (t: string) => {
    if (!config.isConfigured) return;

    setError("");
    setEvents([]);
    setTopic(t);
    setStage("running");
    isRunPhaseRef.current = false;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "plan",
          topic: t,
          llmApiKey: config.llmApiKey,
          llmProvider: config.llmProvider,
          bochaApiKey: config.bochaApiKey,
          ...(config.llmBaseUrl ? { llmBaseUrl: config.llmBaseUrl } : {}),
          ...(config.model ? { model: config.model } : {}),
        }),
        signal: controller.signal,
      });
      await consumeSSE(response);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "未知错误");
      setStage("input");
    }
  }, [config, consumeSSE]);

  const handleConfirmPlan = useCallback(async (selected: TodoItem[]) => {
    setStage("running");
    setError("");
    setEvents([]);
    setCurrentPhase(null);
    isRunPhaseRef.current = true;

    const subtopics = selected.map((item) => {
      const match = item.title.match(/^\[([^\]]+)\]\s+(.+)$/);
      return {
        slug: match ? match[1] : item.id,
        title: match ? match[2] : item.title,
      };
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run",
          topic,
          llmApiKey: config.llmApiKey,
          llmProvider: config.llmProvider,
          bochaApiKey: config.bochaApiKey,
          subtopics,
          researchId: researchIdRef.current,
          ...(config.llmBaseUrl ? { llmBaseUrl: config.llmBaseUrl } : {}),
          ...(config.model ? { model: config.model } : {}),
        }),
        signal: controller.signal,
      });
      await consumeSSE(response);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "未知错误");
      setStage("input");
    }
  }, [config, consumeSSE, topic]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    isRunPhaseRef.current = false;
    setStage("input");
    setEvents([]);
    setPlanItems([]);
    setError("");
    setCurrentPhase(null);
  }, []);

  return (
    <main className="max-w-2xl mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-serif font-bold tracking-tight">ResearchFlow</h1>
        <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
          AI 驱动调研助手 · 自动规划 · 联网搜索 · 数据分析 · 撰写报告
        </p>
      </div>

      {stage === "input" && (
        <ResearchForm loading={false} onSubmit={handleStart} />
      )}

      {error && (
        <ErrorBanner message={error} onRetry={() => handleStart(topic)} onDismiss={() => setError("")} />
      )}

      {stage === "plan" && planItems.length > 0 && (
        <PlanReview
          topic={topic}
          items={planItems}
          onConfirm={handleConfirmPlan}
          onCancel={handleCancel}
        />
      )}

      {stage === "running" && (
        <ProgressPanel
          events={events}
          todoItems={planItems}
          currentPhase={currentPhase}
        />
      )}

      {stage === "done" && reportId && (
        <div className="text-center space-y-4 py-8">
          <EmptyState
            title="调研完成"
            description={`"${topic}" 报告已生成`}
            action={
              <Button onClick={() => router.push(`/report/${reportId}`)}>
                查看报告 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            }
          />
        </div>
      )}
    </main>
  );
}
