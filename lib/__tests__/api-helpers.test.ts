import { describe, it, expect } from "vitest";
import { parseSSELine, parsePlanSlugs, parsePlanFallback } from "../api-helpers";

describe("parseSSELine", () => {
  it("解析 data: 前缀行，返回 JSON 对象", () => {
    const event = { type: "plan", data: { topic: "测试", todoList: [] } };
    const result = parseSSELine(`data: ${JSON.stringify(event)}`);
    expect(result).toEqual(event);
  });

  it("[DONE] 返回 null", () => {
    expect(parseSSELine("data: [DONE]")).toBeNull();
  });

  it("非 data: 行返回 null", () => {
    expect(parseSSELine("")).toBeNull();
    expect(parseSSELine("invalid")).toBeNull();
  });

  it("无效 JSON 返回 null", () => {
    expect(parseSSELine("data: not-json")).toBeNull();
  });
});

describe("parsePlanSlugs", () => {
  it("解析 [slug] Title 格式", () => {
    const content = "1. [ai-funding] AI融资\n2. [market-size] 市场规模";
    const result = parsePlanSlugs(content);
    expect(result).toEqual([
      { slug: "ai-funding", title: "AI融资" },
      { slug: "market-size", title: "市场规模" },
    ]);
  });

  it("无 slug 时返回空数组", () => {
    expect(parsePlanSlugs("1. AI融资\n2. 市场规模")).toEqual([]);
  });
});

describe("parsePlanFallback", () => {
  it("解析纯数字列表", () => {
    const content = "1. AI融资\n2. **市场规模**";
    const result = parsePlanFallback(content);
    expect(result).toEqual([
      { slug: "topic-1", title: "AI融资" },
      { slug: "topic-2", title: "市场规模" },
    ]);
  });
});
