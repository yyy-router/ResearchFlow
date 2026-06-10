import { describe, it, expect } from "vitest";
import { createSSEStream } from "../sse";
import type { ResearchEvent } from "../types";

async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const chunks: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(new TextDecoder().decode(value));
  }
  return chunks.join("");
}

describe("createSSEStream", () => {
  it("emit 将事件编码为 SSE 格式", async () => {
    const controller = new AbortController();
    const { stream, emit, close } = createSSEStream(controller.signal);

    const event: ResearchEvent = {
      type: "research_start",
      data: { subtopic: "test" },
    };
    await emit(event);
    await close();

    const result = await readStream(stream);
    expect(result).toContain('"type":"research_start"');
    expect(result).toContain('"subtopic":"test"');
  });

  it("close 发送 [DONE] 结束标记", async () => {
    const controller = new AbortController();
    const { stream, close } = createSSEStream(controller.signal);
    await close();

    const result = await readStream(stream);
    expect(result).toContain("[DONE]");
  });

  it("每个事件以 data: 前缀开头且以双换行结束", async () => {
    const controller = new AbortController();
    const { stream, emit, close } = createSSEStream(controller.signal);

    await emit({ type: "drafting" });
    await close();

    const result = await readStream(stream);
    expect(result).toMatch(/^data: /);
    expect(result).toContain("\n\n");
  });

  it("abort 信号关闭 stream", async () => {
    const controller = new AbortController();
    const { stream } = createSSEStream(controller.signal);
    controller.abort();

    const reader = stream.getReader();
    const { done } = await reader.read();
    expect(done).toBe(true);
  });
});
