"use client";

import { Search, BarChart3, FileText, ClipboardCheck, CheckCheck, Loader2, Sparkles, Combine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResearchEvent, TodoItem } from "@/lib/types";

const phases = [
  { key: "research", label: "资料搜索", icon: Search },
  { key: "analysis", label: "数据分析", icon: BarChart3 },
  { key: "drafting", label: "报告撰写", icon: FileText },
  { key: "reviewing", label: "报告审阅", icon: ClipboardCheck },
  { key: "finalizing", label: "定稿", icon: CheckCheck },
  { key: "assembly", label: "汇总", icon: Combine },
] as const;

interface ProgressPanelProps {
  events: ResearchEvent[];
  todoItems: TodoItem[];
  currentPhase: string | null;
  researchProgress: Record<string, string>;
  phaseStatus: { phase: string; message: string; detail?: string } | null;
}

export function ProgressPanel({ events, todoItems, currentPhase, researchProgress, phaseStatus }: ProgressPanelProps) {
  const researchDone = events.filter((e) => e.type === "research_done").length;
  const researchTotal = todoItems.length;
  const hasAnalysis = events.some((e) => e.type === "analysis_start");
  const isComplete = events.some((e) => e.type === "complete");

  // Track which subtopics have completed
  const completedSubtops = new Set<string>();
  for (const e of events) {
    if (e.type === "research_done") completedSubtops.add(e.data.subtopic);
  }

  // Derive subtopic info from todo items
  const subtopics = todoItems.map((item) => {
    const title = item.title.replace(/^\[[^\]]+\]\s*/, "");
    const done = completedSubtops.has(title);
    const snippet = researchProgress[title];
    return { title, done, snippet };
  });

  const getPhaseStatus = (key: string): "idle" | "running" | "done" => {
    if (isComplete) return "done";
    if (key === "research") {
      if (researchDone >= researchTotal && researchTotal > 0) return "done";
      if (currentPhase === "research" || researchDone > 0) return "running";
      return "idle";
    }
    if (key === "analysis") {
      if (!hasAnalysis) return "idle";
      if (events.some((e) => e.type === "analysis_done")) return "done";
      return "running";
    }
    if (key === "drafting") {
      if (events.some((e) => e.type === "drafting")) {
        return events.some((e) => e.type === "reviewing") ? "done" : "running";
      }
      return "idle";
    }
    if (key === "reviewing") {
      if (events.some((e) => e.type === "reviewing")) {
        return events.some((e) => e.type === "finalizing") ? "done" : "running";
      }
      return "idle";
    }
    if (key === "finalizing") {
      if (events.some((e) => e.type === "finalizing")) {
        return events.some((e) => e.type === "assembly_start") || isComplete ? "done" : "running";
      }
      return "idle";
    }
    if (key === "assembly") {
      if (events.some((e) => e.type === "assembly_start")) {
        return isComplete ? "done" : "running";
      }
      return "idle";
    }
    return "idle";
  };

  return (
    <div className="space-y-4">
      {/* Phase indicators — compact header */}
      <div className="flex items-center gap-1.5">
        {phases.map((phase) => {
          const status = getPhaseStatus(phase.key);
          const Icon = phase.icon;
          if (phase.key === "analysis" && !hasAnalysis && status === "idle") return null;
          return (
            <div
              key={phase.key}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all duration-500",
                status === "done" && "text-[#C41E3A] bg-[#C41E3A]/5",
                status === "running" && "text-foreground bg-muted/50",
                status === "idle" && "text-muted-foreground/30"
              )}
            >
              <Icon className={cn("w-3 h-3", status === "running" && "animate-pulse")} />
              <span className="hidden sm:inline">{phase.label}</span>
            </div>
          );
        })}
      </div>

      {/* Research cards */}
      {subtopics.length > 0 && (
        <div className="space-y-2">
          {subtopics.map((st) => (
            <div
              key={st.title}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all duration-500",
                st.done
                  ? "border-muted bg-muted/10"
                  : st.snippet
                    ? "border-foreground/10 bg-card"
                    : "border-dashed border-muted bg-card/50"
              )}
            >
              <div className="shrink-0 mt-0.5">
                {st.done ? (
                  <CheckCheck className="w-4 h-4 text-[#C41E3A]" />
                ) : st.snippet ? (
                  <Sparkles className="w-4 h-4 text-foreground/50 animate-pulse" />
                ) : (
                  <Loader2 className="w-4 h-4 text-muted-foreground/40 animate-spin" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-sm font-medium",
                  st.done ? "text-muted-foreground" : "text-foreground"
                )}>
                  {st.title}
                </div>
                {st.snippet && (
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    {st.snippet}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phase detail card (analysis / drafting / reviewing / finalizing) */}
      {phaseStatus && phaseStatus.phase !== "research" && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-300 p-3 rounded-lg border border-foreground/10 bg-card">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-foreground/50" />
            <span className="text-sm font-medium">{phaseStatus.message}</span>
          </div>
          {phaseStatus.detail && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{phaseStatus.detail}</p>
          )}
        </div>
      )}
    </div>
  );
}
