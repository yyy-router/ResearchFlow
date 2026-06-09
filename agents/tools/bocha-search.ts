import { tool } from "@langchain/core/tools";
import { z } from "zod";

interface BochaWebPage {
  name: string;
  url: string;
  displayUrl: string;
  snippet: string;
  siteName: string;
  dateLastCrawled: string;
}

export function createBochaSearchTool(apiKey: string) {
  return tool(
    async ({ query, count }) => {
      const response = await fetch("https://api.bocha.cn/v1/web-search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, count }),
      });

      if (!response.ok) {
        throw new Error(
          `Bocha search failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as {
        code: number;
        data?: {
          webPages?: {
            value?: BochaWebPage[];
          };
        };
      };

      if (data.code !== 200 || !data.data?.webPages?.value) {
        return JSON.stringify({ error: "No results found" });
      }

      const results = data.data.webPages.value.map((r) => ({
        title: r.name,
        url: r.url,
        snippet: r.snippet,
        site: r.siteName,
        date: r.dateLastCrawled ?? "unknown",
      }));

      return JSON.stringify(results, null, 2);
    },
    {
      name: "bocha_web_search",
      description:
        "Search the web using Bocha API. Returns structured results with titles, URLs, snippets, site names, and dates.",
      schema: z.object({
        query: z.string().describe("The search query"),
        count: z
          .number()
          .optional()
          .default(10)
          .describe("Number of results (1-50)"),
      }),
    }
  );
}
