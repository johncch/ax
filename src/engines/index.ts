import { ProgramOptions } from "../index.js";
import { Config } from "../utils/config.js";
import { Using } from "../utils/job.js";
import { OpenAIProvider } from "./openai.js";

export interface AIProvider {
  createChatCompletionRequest(message: ChatItem[]): AIRequest;
}

export interface AIRequest {
  execute(): Promise<AIResponse>;
}

export type AIResponse = AISuccessResponse | AIErrorResponse;

export interface AISuccessResponse {
  type: "success";
  id: string;
  reason: string;
  message: ChatItem;
  model: string;
  usage: {
    in: number;
    out: number;
  };
  raw: any;
}

export interface AIErrorResponse {
  type: "error";
  error: {
    type: string;
    message: string;
  };
  usage: {
    in: number;
    out: number;
  };
  raw: any;
}

export interface ChatItem {
  role: "system" | "user" | "assistant";
  content: string | null;
}

export function getEngine(
  engine: Using,
  config: Config,
  options: ProgramOptions,
): AIProvider | null {
  if (engine.engine == "openai") {
    return new OpenAIProvider(engine.model, config, options);
  }
  return null;
}
