import { CallbackHandler } from "@langfuse/langchain";
import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { trace, context, Span, Context } from "@opentelemetry/api";

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

const tracer = trace.getTracer(TRACER_NAME);

/** Start root research span */
export function startSpan(name: string): Span {
  if (!configured) {
    return trace.getTracer("noop").startSpan("noop");
  }
  return tracer.startSpan(name);
}

/** Start child span under parent */
export function startChildSpan(name: string, parent: Span): Span {
  if (!configured) return startSpan(name);
  const parentCtx = trace.setSpan(context.active(), parent);
  return tracer.startSpan(name, undefined, parentCtx);
}

export function endSpan(span: Span) {
  span.end();
}
