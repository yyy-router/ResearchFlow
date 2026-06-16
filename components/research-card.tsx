"use client";

import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResearchRecord } from "@/lib/types";

interface ResearchCardProps {
  record: ResearchRecord;
  onDelete: (id: string) => void;
}

export function ResearchCard({ record, onDelete }: ResearchCardProps) {
  const date = record.createdAt
    ? new Date(record.createdAt).toLocaleDateString("zh-CN", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border hover:border-foreground/20 transition-colors">
      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <Link href={`/report/${record.id}`} className="font-medium hover:text-[#C41E3A] transition-colors line-clamp-1">
          {record.topic}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {record.status === "error" && (
          <span className="text-xs text-red-500 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950">
            异常
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={() => onDelete(record.id)} className="h-8 w-8">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
