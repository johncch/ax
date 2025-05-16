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

export type Job = SerialJob | BatchJob;

export interface SerialJob {
  type: "serial";
  tools?: string[];
  steps: Step[];
}

export interface BatchJob {
  type: "batch";
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
  replace?: Replace[];
  tools?: string[];
}

export interface WriteToDiskStep extends StepBase {
  uses: "write-to-disk";
  output: string;
}

export interface Replace {
  source: "file";
  pattern: string;
  files: string | string[];
}
