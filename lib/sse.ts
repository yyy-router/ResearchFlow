import type { ResearchEvent } from "@/lib/types";

export function createSSEStream(signal: AbortSignal) {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
      signal.addEventListener("abort", () => {
        try {
          controller?.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  async function emit(event: ResearchEvent) {
    try {
      controller?.enqueue(
        encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
      );
    } catch {
      /* stream closed */
    }
  }

  async function close() {
    try {
      controller?.enqueue(encoder.encode("data: [DONE]\n\n"));
    } catch {
      /* ignore */
    }
    try {
      controller?.close();
    } catch {
      /* already closed */
    }
  }

  return { stream, emit, close };
}
