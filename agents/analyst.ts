import { createAgent } from "langchain";
import { quickjsExecTool } from "./tools/quickjs-exec";
import { createReadFileTool, createWriteFileTool } from "@/lib/agent";
import { resolveModel } from "@/lib/llm";
import { getCallbacks } from "@/lib/tracing";
import type { AgentConfig } from "@/lib/types";

export async function runAnalyst(
  analysisTask: string,
  outputFilename: string,
  dataFiles: string[],
  config: AgentConfig
): Promise<string> {
  const agent = createAgent({
    model: resolveModel(config),
    tools: [
      quickjsExecTool,
      createReadFileTool(config.researchId),
      createWriteFileTool(config.researchId),
    ],
    systemPrompt: `你是一个数据分析师。阅读工作区的 findings 数据，执行数值分析，结论写入 ${outputFilename}。

\`\`\`markdown
# 分析：{任务标题}

## 数据来源

## 计算过程
\`\`\`javascript
// 代码
\`\`\`

## 结果

## 结论
\`\`\`

规则：所有数字必须经过 execute_javascript 计算，禁止猜测。`,
  });

  const fileList = dataFiles.map((f) => `- ${f}`).join("\n");

  await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: `分析任务：${analysisTask}

可用的数据文件：
${fileList}

先用 read_file 读取数据，再计算分析，结果写入 ${outputFilename}。`,
        },
      ],
    },
    { recursionLimit: 30, callbacks: getCallbacks() }
  );

  return outputFilename;
}
