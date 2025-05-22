import { ToolSchema } from "../tools/types.js";
import { ChatItem, ChatItemToolCallResult, ToolCall } from "./types.js";

export class Chat {
  system: string;
  messages: ChatItem[] = [];
  tools: ToolSchema[] = [];

  setToolSchemas(schemas: ToolSchema[]) {
    this.tools = schemas;
  }

  addSystem(message: string) {
    this.system = message;
  }

  addUser(message: string) {
    this.messages.push({ role: "user", content: message });
  }

  addAssistant(message: string, toolCalls?: ToolCall[]) {
    this.messages.push({
      role: "assistant",
      content: message,
      toolCalls: toolCalls,
    });
  }

  addTools(input: Array<ChatItemToolCallResult>) {
    this.messages.push({
      role: "tool",
      content: input,
    });
  }

  toString() {
    return JSON.stringify({
      system: this.system,
      messages: this.messages,
      tools: this.tools,
    });
  }
}
