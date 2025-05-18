import { Recorder } from "../recorder/recorder.js";
import { Stats } from "../types.js";
import { Chat } from "./chat.js";

/*
 Vendor specific configuration
 */
export type OllamaProviderConfig = { url?: string; model: string };
export type AnthropicProviderConfig = { "api-key": string; model?: string };
export type OpenAIProviderConfig = { "api-key": string; model?: string };

export interface AIProviderConfig {
  ollama: OllamaProviderConfig;
  anthropic: AnthropicProviderConfig;
  openai: OpenAIProviderConfig;
}

/*
 General AI Interfaces
 */

export interface AIProvider {
  createChatCompletionRequest(chat: Chat): AIRequest;
}

export interface AIRequest {
  execute(runtime: { recorder?: Recorder }): Promise<AIResponse>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export type AIResponse = AISuccessResponse | AIErrorResponse;

export interface AISuccessResponse {
  type: "success";
  id: string;
  reason: AIProviderStopReason;
  message: ChatItemAssistant;
  model: string;
  toolCalls?: ToolCall[];
  usage: Stats;
  raw: any;
}

export interface AIErrorResponse {
  type: "error";
  error: {
    type: string;
    message: string;
  };
  usage: Stats;
  raw: any;
}

export enum AIProviderStopReason {
  Stop,
  Length,
  FunctionCall,
  Error,
}

export type ChatItem = ChatItemUser | ChatItemAssistant | ChatItemToolCall;

export interface ChatItemUser {
  role: "user";
  name?: string;
  content: string;
}

export interface ChatItemAssistant {
  role: "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

export interface ChatItemToolCallResult {
  id: string;
  content: string;
}

export interface ChatItemToolCall {
  role: "tool";
  content: Array<ChatItemToolCallResult>;
}
