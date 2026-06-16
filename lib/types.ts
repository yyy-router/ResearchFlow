export interface AgentConfig {
  llmApiKey: string;
  llmProvider: "openai" | "anthropic" | "deepseek";
  researchId: string;
  model?: string;
}

export interface ResearchConfig {
  llmApiKey: string;
  llmProvider: "openai" | "anthropic" | "deepseek";
  bochaApiKey: string;
  topic: string;
}

export interface ResearchPlan {
  topic: string;
  todoList: TodoItem[];
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
  | { type: "complete"; data: { reportUrl: string } }
  | { type: "error"; data: { message: string } };
