import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBochaSearchTool } from "../bocha-search";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createBochaSearchTool", () => {
  it("API 返回正常结果时转换为结构化 JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 200,
        data: {
          webPages: {
            value: [
              {
                name: "测试标题",
                url: "https://example.com",
                displayUrl: "example.com",
                snippet: "这是一段摘要",
                siteName: "示例站",
                dateLastCrawled: "2024-01-01T00:00:00Z",
              },
            ],
          },
        },
      }),
    });

    const tool = createBochaSearchTool("test-key");
    const result = await tool.invoke({ query: "测试", count: 5 });
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      title: "测试标题",
      url: "https://example.com",
      snippet: "这是一段摘要",
      site: "示例站",
      date: "2024-01-01T00:00:00Z",
    });
  });

  it("API 返回 code!=200 时返回错误对象", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 500, data: {} }),
    });

    const tool = createBochaSearchTool("test-key");
    const result = await tool.invoke({ query: "测试" });

    expect(result).toContain("No results found");
  });

  it("API 返回空 webPages 时返回错误对象", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 200, data: { webPages: {} } }),
    });

    const tool = createBochaSearchTool("test-key");
    const result = await tool.invoke({ query: "测试" });

    expect(result).toContain("No results found");
  });

  it("HTTP 失败时抛出错误", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    const tool = createBochaSearchTool("test-key");
    await expect(
      tool.invoke({ query: "测试" })
    ).rejects.toThrow("Bocha search failed");
  });

  it("count 使用默认值 10", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 200,
        data: { webPages: { value: [] } },
      }),
    });

    const tool = createBochaSearchTool("test-key");
    await tool.invoke({ query: "测试" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.bocha.cn/v1/web-search",
      expect.objectContaining({
        body: JSON.stringify({ query: "测试", count: 10 }),
      })
    );
  });
});
