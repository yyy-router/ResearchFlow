import { CallbackHandler } from "@langfuse/langchain";

let handler: CallbackHandler | null = null;

export function getCallbackHandler(): CallbackHandler | null {
  if (handler) return handler;

  // LangFuse SDK reads LANGFUSE_PUBLIC_KEY/SECRET_KEY/BASE_URL from env
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    return null;
  }

  handler = new CallbackHandler();
  return handler;
}

export function getCallbacks() {
  const h = getCallbackHandler();
  return h ? [h] : [];
}
