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
  const { llmApiKey, llmProvider, llmBaseUrl, model, bochaApiKey, updateConfig, clearConfig } = useConfig();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-md mx-4 bg-background rounded-lg shadow-lg border p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5" />
          <h2 className="text-lg font-semibold font-serif">API 配置</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">API 协议</label>
            <select
              value={llmProvider}
              onChange={(e) => updateConfig({ llmProvider: e.target.value as typeof llmProvider })}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm"
            >
              <option value="openai">OpenAI 协议</option>
              <option value="anthropic">Anthropic 协议</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">大多数 API 服务商兼容 OpenAI 协议；Anthropic 官方及少数服务商使用 Anthropic 协议</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">API Key</label>
            <Input
              type="password"
              value={llmApiKey}
              onChange={(e) => updateConfig({ llmApiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">API 地址</label>
            <Input
              value={llmBaseUrl}
              onChange={(e) => updateConfig({ llmBaseUrl: e.target.value })}
              placeholder="参考 API 服务商文档填写"
            />
            <p className="text-xs text-muted-foreground mt-1">照抄服务商文档中的 Base URL 即可，无需追加接口路径</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">模型名称</label>
            <Input
              value={model}
              onChange={(e) => updateConfig({ model: e.target.value })}
              placeholder={llmProvider === "openai" ? "gpt-5.5" : "claude-sonnet-4-6"}
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
