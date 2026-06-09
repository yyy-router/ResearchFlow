import { createDeepAgent } from "deepagents";
import { quickjsExecTool } from "./tools/quickjs-exec";
import type { AgentConfig } from "@/lib/types";

export async function runAnalyst(
  analysisTask: string,
  contextFiles: string[],
  config: AgentConfig
): Promise<string> {
  const agent = createDeepAgent({
    tools: [quickjsExecTool],
    systemPrompt: `你是一个数据分析师。当调研涉及数字对比、排名、增长率等计算时，你来完成数值分析。

## 工作流程
1. 阅读上下文文件中的相关数据
2. 明确需要分析的计算任务
3. 使用 execute_javascript 工具执行计算
4. 根据计算结果得出结论
5. 将分析结果写入 analysis 文件

## 输出格式
使用 write_file 工具将结果写入 analysis_{任务简称}.md，格式如下：

\`\`\`markdown
# 分析：{任务标题}

## 数据来源
{从哪些 findings 文件获取的原始数据}

## 计算过程
\`\`\`javascript
{使用的 JS 代码}
\`\`\`

## 结果
{代码执行的输出}

## 结论
{基于数据得出的结论}
\`\`\`

## 规则
- 所有数字必须通过 execute_javascript 计算得出，禁止凭猜测给数字
- 分析任务不清晰时，先澄清再计算
- 结果保留合理精度，不要过度精确`,
  });

  const contextContent = contextFiles.map((f) => `- ${f}`).join("\n");

  await agent.invoke({
    messages: [
      {
        role: "user",
        content: `请完成以下数据分析任务：**${analysisTask}**

可参考的上下文文件：
${contextContent}

完成后将结果写入 analysis_${analysisTask.replace(/[^a-zA-Z一-鿿]/g, "_").slice(0, 30)}.md`,
      },
    ],
  });

  return `analysis_${analysisTask.replace(/[^a-zA-Z一-鿿]/g, "_").slice(0, 30)}.md`;
}
