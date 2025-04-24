import { ToolCall } from "../providers/types.js";

export interface ValidationError {
  value: string;
}

/* Provider Types */

export type OllamaProviderConfig = {
  url: string;
  model: string;
};

export type AnthropicProviderConfig = {
  "api-key": string;
  model: string;
};

export type OpenAIProviderConfig = {
  "api-key": string;
  model: string;
};

export interface BraveProviderConfig {
  "api-key": string;
  delay?: number;
}

export type AIProviderConfig = {
  openai?: Partial<OpenAIProviderConfig> & { "api-key": string };
  anthropic?: Partial<AnthropicProviderConfig> & { "api-key": string };
  ollama?: Partial<OllamaProviderConfig>;
};

export type ToolProviderConfig = {
  brave?: BraveProviderConfig;
};

export type ProviderConfig = AIProviderConfig & ToolProviderConfig;

/* Job Types */

export interface JobConfig {
  using: Using;
  jobs: Record<string, Job>;
}

export type Using = OpenAIUse | AnthropicUse | OllamaUse;

export type OpenAIUse = Partial<OpenAIProviderConfig> & {
  engine: "openai";
};

export type AnthropicUse = Partial<AnthropicProviderConfig> & {
  engine: "anthropic";
};

export type OllamaUse = Partial<OllamaProviderConfig> & {
  engine: "ollama";
};

export type Job = AgentJob | BatchJob;

export interface AgentJob {
  type: "agent";
  tools?: string[];
  variables?: Record<string, string>;
  steps: Step[];
}

export interface SkipOptions {
  folder: string;
  contains: string;
}

export interface BatchJob {
  type: "batch";
  tools?: string[];
  variables?: Record<string, string>;
  batch: {
    type: "files";
    input: string;
    "skip-condition"?: SkipOptions[];
  }[];
  steps: Step[];
}

export type Step =
  | ChatAction
  | ToolAction
  | ToolRespondAction
  | WriteToDiskAction
  | SaveVarAction;

export interface ChatAction {
  action: "chat";
  system?: string;
  content: string;
  replace?: Replace[];
}

export interface ToolAction {
  action: "tool-call";
  toolCalls: ToolCall[];
  throttle?: number;
}

export interface ToolRespondAction {
  action: "tool-respond";
  toolCalls: ToolCall[];
}

export interface WriteToDiskAction {
  action: "write-to-disk";
  output: string;
}

export interface SaveVarAction {
  action: "save-to-variables";
  name: string;
}

export type Replace = ReplaceManyFiles | ReplaceFile | ReplaceVariables;

export interface ReplaceVariables {
  pattern: string;
  source?: "variables";
  name: string;
}

export interface ReplaceFile {
  pattern: string;
  source: "file";
  name: string;
}

export interface ReplaceManyFiles {
  pattern: string;
  source: "many-files";
  name: string | string[];
}
