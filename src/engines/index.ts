import { ProgramOptions } from "../index.js";
import { Config } from "../utils/config.js";
import { Using } from "../utils/job.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";

export interface AIProvider {
  createChatCompletionRequest(chat: Chat): AIRequest;
}

export interface AIRequest {
  execute(): Promise<AIResponse>;
}

export type AIResponse = AISuccessResponse | AIErrorResponse;

export interface AISuccessResponse {
  type: "success";
  id: string;
  reason: AIProviderStopReason;
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

export enum AIProviderStopReason {
  Stop,
  Length,
  FunctionCall,
  Error,
}

export class ChatItem {
  role: "assistant" | "user";
  content: string;
}

export class Chat {
  system: string;
  messages: ChatItem[] = [];

  addSystem(message: string) {
    this.system = message;
  }

  addUser(message: string) {
    this.messages.push({ role: "user", content: message });
  }

  addAssistant(message: string) {
    this.messages.push({ role: "assistant", content: message });
  }

  toOpenAI() {
    const systemMsg = {
      role: "system" as const,
      content: this.system,
    };
    return [systemMsg, ...this.messages];
  }

  toAnthropic() {
    return { system: this.system, messages: this.messages };
  }

  toString() {
    return JSON.stringify({ system: this.system, messages: this.messages });
  }
}

export function getEngine(
  engine: Using,
  config: Config,
  options: ProgramOptions,
): AIProvider | null {
  if (engine.engine == "openai") {
    return new OpenAIProvider(engine.model, config, options);
  }
  if (engine.engine == "anthropic") {
    return new AnthropicProvider(engine.model, config);
  }
  return null;
}
