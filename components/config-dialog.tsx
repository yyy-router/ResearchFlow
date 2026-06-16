"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfig } from "./config-provider";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigDialog({ open, onOpenChange }: ConfigDialogProps) {
  const { llmApiKey, llmProvider, bochaApiKey, updateConfig, clearConfig } = useConfig();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-md mx-4 bg-background rounded-lg shadow-lg border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5" />
          <h2 className="text-lg font-semibold font-serif">API 配置</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">LLM Provider</label>
            <select
              value={llmProvider}
              onChange={(e) => updateConfig({ llmProvider: e.target.value as typeof llmProvider })}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm"
            >
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">LLM API Key</label>
            <Input
              type="password"
              value={llmApiKey}
              onChange={(e) => updateConfig({ llmApiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">博查 API Key</label>
            <Input
              type="password"
              value={bochaApiKey}
              onChange={(e) => updateConfig({ bochaApiKey: e.target.value })}
              placeholder="在 open.bochaai.com 注册获取"
            />
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="ghost" size="sm" onClick={clearConfig}>
            清除配置
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </div>
      </div>
    </div>
  );
}
