import { createAgent } from "langchain";
import { createWriteFileTool } from "@/lib/agent";
import { resolveModel } from "@/lib/llm";
import { getCallbacks } from "@/lib/tracing";
import type { AgentConfig } from "@/lib/types";

export async function runEditor(
  draftContent: string,
  outputFilename: string,
  config: AgentConfig
): Promise<string> {
  const agent = createAgent({
    model: resolveModel(config),
    tools: [createWriteFileTool(config.researchId)],
    systemPrompt: `你是一个严格的编辑。审阅报告草稿，从以下维度提出修改建议，写入 ${outputFilename}。不直接改写原文。

审阅维度：准确性、结构完整性、来源引用、语言表述。

\`\`\`markdown
# 审阅意见

## 总体评价

## 具体建议
### [{severity}] {category}
**问题**: ...
**建议**: ...
\`\`\`

规则：每条标注严重程度（high/medium/low）和类别，建议具体可操作，高质量报告可说"无需重大修改"。`,
  });

  await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: `审阅以下草稿，将意见写入 ${outputFilename}。

---

${draftContent}`,
        },
      ],
    },
    { recursionLimit: 30, callbacks: getCallbacks() }
  );

  return outputFilename;
}
