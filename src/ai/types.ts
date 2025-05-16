import { Chat } from "./chat.js";

export interface AIProvider {
  createChatCompletionRequest(chat: Chat): AIRequest;
}

export interface AIRequest {
  execute(): Promise<AIResponse>;
}

export type AIResponse = AISuccessResponse | AIErrorResponse;

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface AISuccessResponse {
  type: "success";
  id: string;
  reason: AIProviderStopReason;
  message: ChatItemAssistant;
  model: string;
  toolCalls?: ToolCall[];
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
