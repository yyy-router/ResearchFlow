import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { AgentConfig } from "./types";

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-5.5",
  anthropic: "claude-sonnet-4-6",
};

export function resolveModel(config: AgentConfig) {
  const baseURL = config.llmBaseUrl || process.env.LLM_BASE_URL;
  const model = config.model || DEFAULT_MODELS[config.llmProvider] || "gpt-5.5";

  // OpenAI-compatible (covers OpenAI, DeepSeek /v1, and most third-party proxies)
  if (config.llmProvider === "openai") {
    return new ChatOpenAI({
      apiKey: config.llmApiKey,
      model,
      ...(baseURL
        ? { configuration: { baseURL } }
        : {}),
    });
  }

  // Anthropic
  return new ChatAnthropic({
    apiKey: config.llmApiKey,
    model,
    ...(baseURL
      ? { clientOptions: { baseURL } }
      : {}),
  });
}
