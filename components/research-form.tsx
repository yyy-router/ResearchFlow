"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Loader2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfig } from "./config-provider";

interface ResearchFormProps {
  loading?: boolean;
  onSubmit: (topic: string) => void;
}

export function ResearchForm({ loading, onSubmit }: ResearchFormProps) {
  const [topic, setTopic] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const { isConfigured, hydrated } = useConfig();

  const trimmed = topic.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 4;
  const showNotConfigured = hydrated && !isConfigured;
  const cantSubmit = loading || !trimmed || !isConfigured;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSubmit = () => {
    if (tooShort) { setToast("主题至少需要 4 个字符"); return; }
    if (!isConfigured) { setToast("请先在页面右上角配置 API Key"); return; }
    onSubmit(trimmed);
  };

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-background shadow-lg text-sm">
            <AlertCircle className="w-4 h-4 text-[#C41E3A] shrink-0" />
            <span className="text-foreground/80">{toast}</span>
            <button onClick={() => setToast(null)} title="关闭" className="ml-2 shrink-0 hover:text-foreground">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <form
          className="flex flex-col sm:flex-row gap-3"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex-1">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={200}
              placeholder="输入你感兴趣的研究主题"
              disabled={loading || !isConfigured}
              autoComplete="off"
              name="research-topic"
              className="w-full h-12 px-5 text-base bg-background border rounded-lg outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/20 disabled:opacity-50"
            />
          </div>
          <Button
            type="submit"
            disabled={cantSubmit}
            className="h-12 px-6 shrink-0 sm:w-auto w-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>开始调研</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </form>
        {showNotConfigured && (
          <p className="text-xs text-muted-foreground text-center">
            请先在页面右上角配置 API Key
          </p>
        )}
      </div>
    </>
  );
}
