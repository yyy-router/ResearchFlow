import { describe, it, expect } from "vitest";
import { quickjsExecTool } from "../quickjs-exec";

describe("quickjsExecTool", () => {
  it("执行简单表达式并返回 output", async () => {
    const result = await quickjsExecTool.invoke({ code: "1 + 2" });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ output: 3 });
  });

  it("执行数组操作", async () => {
    const result = await quickjsExecTool.invoke({
      code: "[1, 2, 3].map(x => x * 2)",
    });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ output: [2, 4, 6] });
  });

  it("执行字符串操作", async () => {
    const result = await quickjsExecTool.invoke({
      code: '"hello".toUpperCase()',
    });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ output: "HELLO" });
  });

  it("计算增长率等业务场景", async () => {
    const result = await quickjsExecTool.invoke({
      code: `const lastYear = 1000; const thisYear = 1250; const growth = ((thisYear - lastYear) / lastYear) * 100; growth.toFixed(1) + "%";`,
    });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ output: "25.0%" });
  });

  it("语法错误返回 error", async () => {
    const result = await quickjsExecTool.invoke({
      code: "const x = ;",
    });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("error");
  });

  it("运行时错误返回 error", async () => {
    const result = await quickjsExecTool.invoke({
      code: "foo.bar()",
    });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("error");
  });
});
