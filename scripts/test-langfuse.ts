import "dotenv/config";
import { getCallbackHandler } from "../lib/tracing";
import { trace } from "@opentelemetry/api";

console.log("=== LangFuse OTel 诊断 ===\n");

// 1. 通过 tracing 模块获取 handler（触发 OTel 初始化）
console.log("调用 getCallbackHandler()...");
const handler = getCallbackHandler();
console.log("Handler:", handler ? "已创建" : "未配置");
console.log();

// 2. 检查 OTel TracerProvider
console.log("=== OTel TracerProvider ===");
const provider = trace.getTracerProvider();
console.log("Provider 类型:", provider?.constructor?.name ?? "无");
console.log();

// 3. 检查 Delegate
const delegate = (provider as any)?.getDelegate?.();
console.log("Delegate 类型:", delegate?.constructor?.name ?? "无");
if (delegate) {
  const processors = (delegate as any)._spanProcessors ?? [];
  const arr = Array.isArray(processors) ? processors : [processors];
  console.log("SpanProcessors:", arr.length);
  for (const p of arr) {
    console.log("  -", p?.constructor?.name ?? "无");
    const exporter = (p as any)?._exporter;
    console.log("    Exporter:", exporter?.constructor?.name ?? "无");
    console.log("    Endpoint:", (exporter as any)?._url ?? "无");
  }
}
console.log();

// 4. 手动创建 span
console.log("=== 手动创建 span ===");
const tracer = trace.getTracer("test");
const span = tracer.startSpan("test-span");
span.setAttribute("research.id", "test-123");
console.log("Span ID:", span.spanContext().spanId);
console.log("Trace ID:", span.spanContext().traceId);
console.log("isRecording:", (span as any).isRecording?.());
span.end();
console.log("Span ended");
console.log();

// 5. 等待导出 + 清理
setTimeout(async () => {
  const proc = (delegate as any)?._spanProcessors?.[0];
  if (proc?.forceFlush) await proc.forceFlush();
  if (proc?.shutdown) await proc.shutdown();
  console.log("完成。请检查 LangFuse 控制台是否有 test-span。");
  process.exit(0);
}, 5000);
