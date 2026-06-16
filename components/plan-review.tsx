"use client";

import { useState } from "react";
import { Check, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TodoItem } from "@/lib/types";

interface PlanReviewProps {
  topic: string;
  items: TodoItem[];
  onConfirm: (selected: TodoItem[]) => void;
  onCancel: () => void;
}

export function PlanReview({ topic, items, onConfirm, onCancel }: PlanReviewProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(items.map((i) => i.id))
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const confirmed = items.filter((i) => selected.has(i.id));

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div className="flex items-center gap-2">
        <Check className="w-5 h-5 text-[#C41E3A]" />
        <h2 className="font-serif font-semibold text-lg">调研计划</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        主题：{topic} · {items.length} 个子方向。勾选要执行的子方向，点击"开始执行"继续。
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
              selected.has(item.id)
                ? "border-foreground/20 bg-accent/50"
                : "border-transparent bg-muted/30 opacity-60"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              className="rounded w-4 h-4 accent-[#C41E3A]"
            />
            <span className="text-sm flex-1">{item.title}</span>
            {selected.has(item.id) ? (
              <Check className="w-4 h-4 text-[#C41E3A]" />
            ) : (
              <X className="w-4 h-4 text-muted-foreground" />
            )}
          </label>
        ))}
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button
          onClick={() => onConfirm(confirmed)}
          disabled={confirmed.length === 0}
        >
          <Play className="w-4 h-4" />
          <span className="ml-1.5">开始执行</span>
        </Button>
      </div>
    </div>
  );
}
