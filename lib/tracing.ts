import { CallbackHandler } from "@langfuse/langchain";
import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

let handler: CallbackHandler | null = null;
let initialized = false;

function ensureProvider() {
  if (initialized) return;
  initialized = true;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) return;

  const baseUrl = process.env.LANGFUSE_BASE_URL ?? "https://us.cloud.langfuse.com";
  const endpoint = `${baseUrl}/api/public/otel/v1/traces`;

  const exporter = new OTLPTraceExporter({
    url: endpoint,
    headers: {
      Authorization: `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}`,
    },
  });

  const processor = new BatchSpanProcessor(exporter);
  const provider = new NodeTracerProvider({ spanProcessors: [processor] });
  provider.register();
}

export function getCallbackHandler(): CallbackHandler | null {
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    return null;
  }

  ensureProvider();

  if (!handler) {
    handler = new CallbackHandler();
  }
  return handler;
}

export function getCallbacks() {
  const h = getCallbackHandler();
  return h ? [h] : [];
}
