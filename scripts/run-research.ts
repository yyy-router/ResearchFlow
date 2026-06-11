import "dotenv/config";
import { runResearch } from "../agents/orchestrator";
import type { ResearchEvent } from "../lib/types";
import fs from "node:fs/promises";
import path from "node:path";

// — 命令行参数 —
const topic = process.argv[2];
const provider = (process.argv[3] ?? "deepseek") as
  | "openai"
  | "anthropic"
  | "deepseek";

if (!topic) {
  console.error("用法: npx tsx scripts/run-research.ts <调研主题> [provider]");
  console.error("示例: npx tsx scripts/run-research.ts '2024年AI行业融资趋势' deepseek");
  console.error("");
  console.error(".env 中需要配置:");
  console.error("  LLM_API_KEY  - LLM API Key");
  console.error("  LLM_MODEL    - 模型名称 (如 deepseek-chat, claude-sonnet-4-5-20250929, gpt-4o)");
  console.error("  BOCHA_API_KEY - 博查搜索 API Key");
  process.exit(1);
}

const llmApiKey = process.env.LLM_API_KEY ?? "";
const llmModel = process.env.LLM_MODEL ?? "";
const bochaApiKey = process.env.BOCHA_API_KEY ?? "";

if (!llmApiKey) {
  console.error("错误: 请在 .env 中设置 LLM_API_KEY");
  process.exit(1);
}
if (!llmModel) {
  console.error("错误: 请在 .env 中设置 LLM_MODEL");
  process.exit(1);
}
if (!bochaApiKey) {
  console.error("错误: 请在 .env 中设置 BOCHA_API_KEY");
  process.exit(1);
}

// — 将统一 Key 映射到各 SDK 需要的环境变量 —
const PROVIDER_ENV_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};
process.env[PROVIDER_ENV_MAP[provider]] = llmApiKey;

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  调研主题: ${topic}`);
  console.log(`  Provider: ${provider}`);
  console.log(`  Model: ${llmModel}`);
  console.log(`  开始时间: ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}\n`);

  const controller = new AbortController();
  const { id, stream } = await runResearch(
    { topic, llmApiKey, llmProvider: provider, bochaApiKey },
    controller.signal
  );

  // — 消费 SSE 流 —
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const allEvents: ResearchEvent[] = [];

  console.log("--- SSE 事件流 ---\n");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;

      try {
        const event: ResearchEvent = JSON.parse(payload);
        allEvents.push(event);
        printEvent(event);
      } catch {
        console.log(`  [无法解析] ${payload.slice(0, 100)}`);
      }
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  调研完成 | ID: ${id} | 共 ${allEvents.length} 个事件`);
  console.log(`${"=".repeat(60)}\n`);

  // — 保存最终报告 —
  const reportPath = path.join(
    process.cwd(), "data", `research-${id}`, "final_report.md"
  );
  try {
    const report = await fs.readFile(reportPath, "utf-8");
    console.log(`报告位置: ${reportPath}`);
    console.log(`\n--- 报告预览 (前 500 字符) ---\n`);
    console.log(report.slice(0, 500));
  } catch {
    console.error(`错误: 无法读取 ${reportPath}`);
  }

  // — 错误汇总 —
  const errors = allEvents.filter((e) => e.type === "error");
  if (errors.length > 0) {
    console.log(`\n⚠  ${errors.length} 个错误:`);
    for (const e of errors) {
      if (e.type === "error") console.log(`  - ${e.data.message}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

function printEvent(event: ResearchEvent) {
  const t = new Date().toLocaleTimeString();
  switch (event.type) {
    case "plan":
      console.log(`[${t}] 📋 计划: ${event.data.todoList.length} 个子方向`);
      for (const item of event.data.todoList) console.log(`         - ${item.title}`);
      break;
    case "research_start":
      console.log(`[${t}] 🔍 开始调研: ${event.data.subtopic}`);
      break;
    case "research_done":
      console.log(`[${t}]   ✅ 完成: ${event.data.subtopic}`);
      break;
    case "analysis_start":
      console.log(`[${t}] 📊 分析: ${event.data.title}`);
      break;
    case "drafting":
      console.log(`[${t}] ✍️  撰写草稿...`);
      break;
    case "reviewing":
      console.log(`[${t}] 🔎 审阅中...`);
      break;
    case "finalizing":
      console.log(`[${t}] 📝 定稿中...`);
      break;
    case "complete":
      console.log(`[${t}] 🎉 完成: ${event.data.reportUrl}`);
      break;
    case "error":
      console.log(`[${t}] ❌ 错误: ${event.data.message}`);
      break;
    default:
      break;
  }
}

main();
