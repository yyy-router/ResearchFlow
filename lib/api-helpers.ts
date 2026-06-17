import type { ResearchEvent, SubtopicEntry } from "./types";

export function parseSSELine(line: string): ResearchEvent | null {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6);
  if (payload === "[DONE]") return null;
  try {
    return JSON.parse(payload) as ResearchEvent;
  } catch {
    return null;
  }
}

export function parsePlanSlugs(content: string): SubtopicEntry[] {
  const slugRegex = /^\d+\.\s+\[([a-z0-9-]+)\]\s+(.+)$/mgi;
  const entries: SubtopicEntry[] = [];
  for (const m of content.matchAll(slugRegex)) {
    entries.push({ slug: m[1], title: m[2].trim() });
  }
  return entries;
}

export function parsePlanFallback(content: string): SubtopicEntry[] {
  const entries: SubtopicEntry[] = [];
  let i = 1;
  for (const m of content.matchAll(/^\d+\.\s+(.+)$/gm)) {
    entries.push({ slug: `topic-${i++}`, title: m[1].replace(/\*{1,3}/g, "").trim() });
  }
  return entries;
}
