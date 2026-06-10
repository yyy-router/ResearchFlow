import { Client } from "langsmith";

let client: Client | null = null;

function getClient(): Client | null {
  const apiKey = process.env.LANGSMITH_API_KEY ?? process.env.LANGCHAIN_API_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new Client({ apiKey });
  }
  return client;
}

export async function traceResearchRun(
  researchId: string,
  topic: string,
  fn: () => Promise<void>
): Promise<void> {
  const c = getClient();
  if (!c) {
    return fn();
  }

  await c.createRun({
    id: researchId,
    name: topic,
    run_type: "chain",
    inputs: { topic },
    project_name: process.env.LANGCHAIN_PROJECT ?? "researchflow",
    start_time: Date.now(),
  });

  try {
    await fn();
    await c.updateRun(researchId, {
      end_time: Date.now(),
      outputs: { status: "completed" },
    });
  } catch (error) {
    await c.updateRun(researchId, {
      end_time: Date.now(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
