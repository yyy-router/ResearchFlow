"use client";

import { Search, BarChart3, FileText, ClipboardCheck, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResearchEvent, TodoItem } from "@/lib/types";

const phases = [
  { key: "research", label: "资料搜索", icon: Search },
  { key: "analysis", label: "数据分析", icon: BarChart3 },
  { key: "drafting", label: "报告撰写", icon: FileText },
  { key: "reviewing", label: "报告审阅", icon: ClipboardCheck },
  { key: "finalizing", label: "定稿", icon: CheckCheck },
] as const;

interface ProgressPanelProps {
  events: ResearchEvent[];
  todoItems: TodoItem[];
  currentPhase: string | null;
}

export function ProgressPanel({ events, todoItems, currentPhase }: ProgressPanelProps) {
  const researchDone = events.filter((e) => e.type === "research_done").length;
  const researchTotal = todoItems.length;
  const hasAnalysis = events.some((e) => e.type === "analysis_start");
  const isComplete = events.some((e) => e.type === "complete");

  const phaseStatus = (key: string): "idle" | "running" | "done" => {
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
        return isComplete ? "done" : "running";
      }
      return "idle";
    }
    return "idle";
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Loader2 className={cn("w-3.5 h-3.5", currentPhase && !isComplete && "animate-spin")} />
        {isComplete ? "已完成" : currentPhase ? "执行中..." : "准备中..."}
      </h3>

      {/* Research sub-progress */}
      {researchTotal > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted/30">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm flex-1">资料搜索</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {researchDone}/{researchTotal}
          </span>
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-[#C41E3A] transition-all duration-500"
              style={{ width: `${researchTotal ? (researchDone / researchTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Phase indicators */}
      <div className="flex gap-2">
        {phases.map((phase) => {
          const status = phaseStatus(phase.key);
          const Icon = phase.icon;
          if (phase.key === "analysis" && !hasAnalysis && status === "idle") return null;
          return (
            <div
              key={phase.key}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 p-2 rounded-md text-center transition-colors",
                status === "done" && "text-[#C41E3A]",
                status === "running" && "text-foreground animate-pulse",
                status === "idle" && "text-muted-foreground/40"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] leading-tight">{phase.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
