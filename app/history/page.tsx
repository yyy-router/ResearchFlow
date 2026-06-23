"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ResearchCard } from "@/components/research-card";
import { EmptyState } from "@/components/empty-state";
import type { ResearchRecord } from "@/lib/types";

export default function HistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ResearchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history");
      if (res.ok) setRecords(await res.json());
    } catch { /* keep stale data */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/research/${id}`, { method: "DELETE" });
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch { /* silently fail */ }
  }, []);

  const handleContinue = useCallback((id: string) => {
    sessionStorage.setItem("researchResumeId", id);
    router.push("/");
  }, [router]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="inline-flex items-center justify-center size-8 rounded-md hover:bg-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-serif font-semibold">历史调研</h1>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">加载中...</p>
      ) : records.length === 0 ? (
        <EmptyState
          title="暂无调研记录"
          description="开始你的第一次调研吧"
          action={
            <Link href="/" className={buttonVariants({ variant: "default" })}>开始调研</Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <ResearchCard key={r.id} record={r} onDelete={handleDelete} onContinue={handleContinue} />
          ))}
        </div>
      )}
    </main>
  );
}
