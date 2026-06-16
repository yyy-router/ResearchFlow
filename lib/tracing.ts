import { CallbackHandler } from "@langfuse/langchain";
import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { trace, context, Context } from "@opentelemetry/api";

const TRACER_NAME = "researchflow";
let handler: CallbackHandler | null = null;
let initialized = false;

const configured = !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);

function ensureProvider() {
  if (initialized || !configured) return;
  initialized = true;

  const pk = process.env.LANGFUSE_PUBLIC_KEY!;
  const sk = process.env.LANGFUSE_SECRET_KEY!;
  const baseUrl = process.env.LANGFUSE_BASE_URL ?? "https://us.cloud.langfuse.com";

  const exporter = new OTLPTraceExporter({
    url: `${baseUrl}/api/public/otel/v1/traces`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${pk}:${sk}`).toString("base64")}`,
    },
  });

  const provider = new NodeTracerProvider({ spanProcessors: [new BatchSpanProcessor(exporter)] });
  provider.register();
}

// ── Callbacks ──

export function getCallbackHandler(): CallbackHandler | null {
  if (!configured) return null;
  ensureProvider();
  if (!handler) handler = new CallbackHandler();
  return handler;
}

export function getCallbacks() {
  const h = getCallbackHandler();
  return h ? [h] : [];
}

// ── Nested spans ──

const noopTracer = { startSpan: () => ({ end: () => {} }) } as unknown as ReturnType<typeof trace.getTracer>;
const active = configured ? trace.getTracer(TRACER_NAME) : noopTracer;

/** Wrap an async operation in a named span. Child spans (from CallbackHandler) automatically nest under it. */
export async function withSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const span = active.startSpan(name);
  const ctx = trace.setSpan(context.active(), span);
  try {
    return await context.with(ctx, fn);
  } finally {
    span.end();
  }
}
