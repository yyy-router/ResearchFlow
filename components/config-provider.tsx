"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ConfigState {
  llmApiKey: string;
  llmProvider: "openai" | "anthropic" | "deepseek";
  bochaApiKey: string;
}

interface ConfigContextValue extends ConfigState {
  isConfigured: boolean;
  updateConfig: (config: Partial<ConfigState>) => void;
  clearConfig: () => void;
}

const STORAGE_KEY = "researchflow-config";

function loadConfig(): ConfigState {
  if (typeof window === "undefined") {
    return { llmApiKey: "", llmProvider: "deepseek", bochaApiKey: "" };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { llmApiKey: "", llmProvider: "deepseek", bochaApiKey: "" };
}

function saveConfig(config: ConfigState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigState>(loadConfig);

  const updateConfig = useCallback((partial: Partial<ConfigState>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  const clearConfig = useCallback(() => {
    const empty = { llmApiKey: "", llmProvider: "deepseek" as const, bochaApiKey: "" };
    setConfig(empty);
    saveConfig(empty);
  }, []);

  const isConfigured = !!(config.llmApiKey && config.bochaApiKey);

  return (
    <ConfigContext.Provider value={{ ...config, isConfigured, updateConfig, clearConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
