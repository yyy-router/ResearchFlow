export interface AgentConfig {
  llmApiKey: string;
  llmProvider: "openai" | "anthropic";
  researchId: string;
  model?: string;
  llmBaseUrl?: string;
}

export interface ResearchConfig {
  llmApiKey: string;
  llmProvider: "openai" | "anthropic";
  bochaApiKey: string;
  topic: string;
  llmBaseUrl?: string;
  model?: string;
}

export interface ResearchPlan {
  topic: string;
  todoList: TodoItem[];
  researchId: string;
}

export interface TodoItem {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
}

export interface SubtopicEntry {
  slug: string;
  title: string;
}

export interface AnalysisResult {
  title: string;
  code: string;
  output: string;
  conclusion: string;
}

export interface ResearchRecord {
  id: string;
  topic: string;
  createdAt: string;
  status: "completed" | "error";
}

export type ResearchEvent =
  | { type: "plan"; data: ResearchPlan }
  | { type: "research_start"; data: { subtopic: string } }
  | { type: "research_progress"; data: { subtopic: string; snippet: string } }
  | { type: "research_done"; data: { subtopic: string } }
  | { type: "analysis_start"; data: { title: string } }
  | { type: "analysis_done"; data: AnalysisResult }
  | { type: "drafting" }
  | { type: "reviewing" }
  | { type: "finalizing" }
  | { type: "assembly_start" }
  | { type: "report_stream"; data: { content: string } }
  | { type: "report_section"; data: { index: number; content: string } }
  | { type: "report_final"; data: { content: string } }
  | { type: "complete"; data: { reportUrl: string } }
  | { type: "error"; data: { message: string } };
