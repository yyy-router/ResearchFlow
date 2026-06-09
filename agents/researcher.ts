import { createDeepAgent } from "deepagents";
import { createBochaSearchTool } from "./tools/bocha-search";
import type { AgentConfig } from "@/lib/types";

export async function runResearcher(
  subtopic: string,
  config: AgentConfig & { bochaApiKey: string }
): Promise<string> {
  const searchTool = createBochaSearchTool(config.bochaApiKey);

  const agent = createDeepAgent({
    tools: [searchTool],
    systemPrompt: `你是一个专注的调研员。你的任务是深入研究一个子主题，通过联网搜索收集资料。

## 工作流程
1. 分析子主题，确定需要搜索的关键信息
2. 使用 bocha_web_search 工具进行多次搜索，每次调整查询词以覆盖不同角度
3. 从搜索结果中提取关键事实，确保每条重要信息都附上来源 URL
4. 将调研结果写入 findings 文件

## 输出格式
使用 write_file 工具将结果写入 findings_{子主题简称}.md，格式如下：

\`\`\`markdown
# 子主题：{subtopic}

## 关键发现

### 发现 1：{标题}
{详细描述}
- 来源：[{标题}]({url})

### 发现 2：{标题}
{详细描述}
- 来源：[{标题}]({url})

## 总结
{2-3 句话概括核心结论}
\`\`\`

## 规则
- 每次搜索后仔细阅读结果，筛选高质量信息
- 优先使用官方来源、权威媒体
- 不编造信息，所有事实必须有来源支撑
- 如果搜索结果不充分，调整查询词重试`,
  });

  await agent.invoke({
    messages: [
      {
        role: "user",
        content: `请调研以下子主题，并通过联网搜索收集资料：**${subtopic}**

完成后将结果写入 findings_${subtopic.replace(/[^a-zA-Z一-鿿]/g, "_").slice(0, 30)}.md`,
      },
    ],
  });

  return `findings_${subtopic.replace(/[^a-zA-Z一-鿿]/g, "_").slice(0, 30)}.md`;
}
