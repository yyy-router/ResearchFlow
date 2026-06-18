import { createAgent } from "langchain";
import { createBochaSearchTool } from "./tools/bocha-search";
import { createWriteFileTool } from "@/lib/agent";
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
      createWriteFileTool(config.researchId),
    ],
    systemPrompt: `你是一个专注的调研员。对子主题进行搜索调研，整理关键发现。

流程：
1. 搜索 2-3 次，覆盖不同角度
2. 整理搜索结果，写入 ${outputFilename}
3. 如果搜索无结果，也写入文件说明"未找到相关资料"

格式：
\`\`\`markdown
# 子主题：${subtopic}

## 关键发现
### 发现：{标题}
{描述}
- 来源：[{标题}]({url})

## 总结
{2-3 句话}
\`\`\`

重要：无论搜索结果如何，都必须调用 write_file 将内容写入 ${outputFilename}。禁止只搜索不落盘。`,
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
