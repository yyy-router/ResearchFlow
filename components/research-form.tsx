"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfig } from "./config-provider";

interface ResearchFormProps {
  loading?: boolean;
  onSubmit: (topic: string) => void;
}

export function ResearchForm({ loading, onSubmit }: ResearchFormProps) {
  const [topic, setTopic] = useState("");
  const { isConfigured, hydrated } = useConfig();

  // During hydration, show inputs as disabled without the "not configured" hint
  // to match the SSR output (empty config). After hydration, show real state.
  const showNotConfigured = hydrated && !isConfigured;
  const cantSubmit = loading || !topic.trim() || !isConfigured;

  return (
    <div className="space-y-4">
      {showNotConfigured && (
        <p className="text-sm text-muted-foreground text-center">
          请先在右上角"配置"中设置 API Key
        </p>
      )}
      <div className="flex gap-3">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="输入调研主题，如：2024 年 AI 行业融资趋势"
          disabled={loading || !isConfigured}
          className="flex-1 h-12 text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !cantSubmit) onSubmit(topic.trim());
          }}
        />
        <Button
          onClick={() => onSubmit(topic.trim())}
          disabled={cantSubmit}
          className="h-12 px-6 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span className="ml-2">开始调研</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
