import {
  AIProviderConfig,
  AnthropicProviderConfig,
  GoogleAIProviderConfig,
  OllamaProviderConfig,
  OpenAIProviderConfig,
} from "../../ai/types.js";
import { ResTypeStrings } from "../../core/types.js";

export interface ValidationError {
  value: string;
}

/* Provider Types */

export interface BraveProviderConfig {
  "api-key": string;
  rateLimit?: number; // request per second
}

export type ToolProviderConfig = {
  brave?: BraveProviderConfig;
};

export type ServiceConfig = Partial<AIProviderConfig> & ToolProviderConfig;

/* Job Types */

export interface JobConfig {
  using: AIProviderUse;
  jobs: DAGJob;
}

export type AIProviderUse =
  | ({ engine: "ollama" } & Partial<OllamaProviderConfig>)
  | ({ engine: "anthropic" } & Partial<AnthropicProviderConfig>)
  | ({ engine: "openai" } & Partial<OpenAIProviderConfig>)
  | ({ engine: "google" } & Partial<GoogleAIProviderConfig>);

export interface DAGJob {
  [name: string]: Job & { dependsOn?: string | string[] };
}

export type Job = SerialJob | BatchJob;

export interface SerialJob {
  tools?: string[];
  steps: Step[];
}

export interface BatchJob {
  tools?: string[];
  batch: BatchOptions[];
  steps: Step[];
}

export interface SkipOptions {
  type: "file-exist";
  pattern: string;
}

export interface BatchOptions {
  type: "files";
  source: string;
  bind: string;
  ["skip-if"]?: SkipOptions[];
}

export type Step = ChatStep | WriteToDiskStep;

export interface StepBase {
  readonly uses: string;
}

export interface ChatStep extends StepBase {
  uses: "chat";
  system?: string;
  message: string;
  output?: Record<string, ResTypeStrings>;
  replace?: Replace[];
  tools?: string[];
}

export interface WriteToDiskStep extends StepBase {
  uses: "write-to-disk";
  output: string;
  keys: string | string[];
}

export interface Replace {
  source: "file";
  pattern: string;
  files: string | string[];
}
