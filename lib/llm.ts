import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { AgentConfig } from "./types";

export function resolveModel(config: AgentConfig) {
  const baseURL = process.env.LLM_BASE_URL;

  // OpenAI-compatible providers (openai, deepseek, third-party proxies)
  if (config.llmProvider === "openai" || config.llmProvider === "deepseek") {
    return new ChatOpenAI({
      apiKey: config.llmApiKey,
      model: config.model ?? "gpt-4o",
      ...(baseURL
        ? { configuration: { baseURL } }
        : {}),
    });
  }

  // Anthropic (supports DeepSeek /anthropic endpoint via LLM_BASE_URL)
  return new ChatAnthropic({
    apiKey: config.llmApiKey,
    model: config.model ?? "claude-sonnet-4-5-20250929",
    ...(baseURL
      ? { clientOptions: { baseURL } }
      : {}),
  });
}
