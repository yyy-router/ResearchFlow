import { createAgent } from "langchain";
import { createBochaSearchTool } from "./tools/bocha-search";
import { writeFile } from "@/lib/storage";
import { resolveModel } from "@/lib/llm";
import { getCallbacks } from "@/lib/tracing";
import type { AgentConfig } from "@/lib/types";

export async function runResearcher(
  subtopic: string,
  outputFilename: string,
  config: AgentConfig & { bochaApiKey: string },
  onSearchResults?: (query: string, results: { title: string; snippet: string }[]) => void
): Promise<string> {
  const agent = createAgent({
    model: resolveModel(config),
    tools: [
      createBochaSearchTool(config.bochaApiKey, onSearchResults),
    ],
    systemPrompt: `你是一个专注的调研员。对子主题进行搜索调研，整理关键发现。

流程：
1. 搜索 2-3 次，覆盖不同角度
2. 整理搜索结果，用 Markdown 输出调研结果

输出格式：
\`\`\`markdown
# 子主题：${subtopic}

## 关键发现
### 发现：{标题}
{描述}
- 来源：[{标题}]({url})

## 总结
{2-3 句话}
\`\`\`

重要：搜索完成后必须输出完整的调研结果。如果搜索无结果，也输出"未找到相关资料"。`,
  });

  const result = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: `调研子主题：${subtopic}。搜索并整理资料，用 Markdown 格式输出完整的调研结果。`,
        },
      ],
    },
    { recursionLimit: 100, callbacks: getCallbacks() }
  );

  // Extract the final AI message and write to file ourselves
  // This avoids tool-calling unreliability (LLM not calling write_file)
  const messages = result.messages as { _getType?: () => string; content?: string; text?: string }[];
  let content = "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const type = msg._getType?.() ?? "";
    if (type === "ai") {
      content = typeof msg.content === "string" ? msg.content : "";
      break;
    }
  }

  if (!content) {
    content = `# 子主题：${subtopic}\n\n未能获取到相关资料。\n`;
  }

  await writeFile(config.researchId, outputFilename, content);
  console.log(`[Research] 写入: ${outputFilename} (${content.length} 字符)`);

  return outputFilename;
}
