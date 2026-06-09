import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getQuickJS } from "quickjs-emscripten";

export const quickjsExecTool = tool(
  async ({ code }) => {
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();

    try {
      const result = vm.evalCode(code);
      if (result.error) {
        const errorStr = vm.dump(result.error);
        result.error.dispose();
        return JSON.stringify({ error: errorStr });
      }
      const output = vm.dump(result.value);
      result.value.dispose();
      return JSON.stringify({ output });
    } finally {
      vm.dispose();
    }
  },
  {
    name: "execute_javascript",
    description:
      "Execute JavaScript code for numerical analysis. Use for calculations, comparisons, rankings, growth rates, etc. Never guess numbers — always run them through this tool.",
    schema: z.object({
      code: z
        .string()
        .describe(
          "JavaScript code to execute. Use console.log() or the last expression value to return results."
        ),
    }),
  }
);
