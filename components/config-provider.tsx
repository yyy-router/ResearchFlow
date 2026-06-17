"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

interface ConfigState {
  llmApiKey: string;
  llmProvider: "openai" | "anthropic";
  llmBaseUrl: string;
  model: string;
  bochaApiKey: string;
}

interface ConfigContextValue extends ConfigState {
  isConfigured: boolean;
  hydrated: boolean;
  updateConfig: (config: Partial<ConfigState>) => void;
  clearConfig: () => void;
}

const STORAGE_KEY = "researchflow-config";
const EMPTY: ConfigState = {
  llmApiKey: "", llmProvider: "openai", bochaApiKey: "", llmBaseUrl: "", model: "",
};

function readStorage(): ConfigState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveConfig(config: ConfigState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  // Always start empty to match SSR output — hydrate from storage after mount
  const [config, setConfig] = useState<ConfigState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStorage();
    if (stored) setConfig({ ...EMPTY, ...stored });
    setHydrated(true);
  }, []);

  const updateConfig = useCallback((partial: Partial<ConfigState>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  const clearConfig = useCallback(() => {
    setConfig(EMPTY);
    saveConfig(EMPTY);
  }, []);

  const isConfigured = !!(config.llmApiKey && config.bochaApiKey);

  return (
    <ConfigContext.Provider value={{ ...config, isConfigured, hydrated, updateConfig, clearConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
