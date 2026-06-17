"use client";

import { useState } from "react";
import { Check, Play, X, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TodoItem } from "@/lib/types";

interface PlanReviewProps {
  topic: string;
  items: TodoItem[];
  onConfirm: (selected: TodoItem[]) => void;
  onCancel: () => void;
}

export function PlanReview({ topic, items, onConfirm, onCancel }: PlanReviewProps) {
  const [editableItems, setEditableItems] = useState<TodoItem[]>(items);
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)));
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const startEdit = (id: string) => setEditingId(id);

  const saveEdit = (id: string, title: string) => {
    setEditableItems((prev) => prev.map((item) => (item.id === id ? { ...item, title } : item)));
    setEditingId(null);
  };

  const addItem = () => {
    const newId = `custom-${Date.now()}`;
    const newItem: TodoItem = { id: newId, title: "", status: "pending" };
    setEditableItems((prev) => [...prev, newItem]);
    setSelected((prev) => new Set([...prev, newId]));
    setEditingId(newId);
  };

  const removeItem = (id: string) => {
    setEditableItems((prev) => prev.filter((item) => item.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const confirmed = editableItems.filter((i) => selected.has(i.id) && i.title.trim());

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div className="flex items-center gap-2">
        <Check className="w-5 h-5 text-[#C41E3A]" />
        <h2 className="font-serif font-semibold text-lg">调研计划</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        主题：{topic} · {editableItems.length} 个子方向。点击标题可编辑，勾选后执行。
      </p>

      <div className="space-y-2">
        {editableItems.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
              selected.has(item.id)
                ? "border-foreground/20 bg-accent/50"
                : "border-transparent bg-muted/30 opacity-60"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              className="rounded w-4 h-4 accent-[#C41E3A] shrink-0"
            />
            {editingId === item.id ? (
              <Input
                className="flex-1 h-8 text-sm"
                value={item.title}
                onChange={(e) =>
                  setEditableItems((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, title: e.target.value } : i))
                  )
                }
                onBlur={() => saveEdit(item.id, item.title)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(item.id, (e.target as HTMLInputElement).value);
                  if (e.key === "Escape") setEditingId(null);
                }}
                placeholder="输入子方向名称"
                autoFocus
              />
            ) : (
              <span
                className="text-sm flex-1 cursor-pointer hover:text-[#C41E3A] transition-colors"
                onClick={() => startEdit(item.id)}
              >
                {item.title || "新子方向（点击编辑）"}
              </span>
            )}
            <div className="flex items-center gap-1 shrink-0">
              {editingId !== item.id && (
                <button
                  onClick={() => startEdit(item.id)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="编辑"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => removeItem(item.id)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="删除"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={addItem} className="gap-1">
        <Plus className="w-3.5 h-3.5" />
        添加子方向
      </Button>

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
