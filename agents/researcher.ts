import { createAgent } from "langchain";
import { createBochaSearchTool } from "./tools/bocha-search";
import { createWriteFileTool } from "@/lib/agent";
import { resolveModel } from "@/lib/llm";
import { getCallbacks } from "@/lib/tracing";
import type { AgentConfig } from "@/lib/types";

export async function runResearcher(
  subtopic: string,
  outputFilename: string,
  config: AgentConfig & { bochaApiKey: string }
): Promise<string> {
  const agent = createAgent({
    model: resolveModel(config),
    tools: [
      createBochaSearchTool(config.bochaApiKey),
      createWriteFileTool(config.researchId),
    ],
    systemPrompt: `你是一个专注的调研员。搜索并收集资料，整理关键发现，写入 ${outputFilename}。

搜索 3-5 次，覆盖不同角度。格式：

\`\`\`markdown
# 子主题：${subtopic}

## 关键发现
### 发现：{标题}
{描述}
- 来源：[{标题}]({url})

## 总结
{2-3 句话}
\`\`\`

规则：优先官方来源和权威媒体，所有事实附来源，搜索 5 次后必须落盘。`,
  });

  await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: `调研子主题：${subtopic}。搜索并整理资料，写入 ${outputFilename}。`,
        },
      ],
    },
    { recursionLimit: 100, callbacks: getCallbacks() }
  );

  return outputFilename;
}
