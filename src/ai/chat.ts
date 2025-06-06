import { ToolSchema } from "../tools/types.js";
import { FileInfo } from "../utils/file.js";
import {
  ChatContent,
  ChatContentFile,
  ChatContentText,
  ChatItem,
  ChatItemToolCallResult,
  ToolCall,
} from "./types.js";

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

  addUserWithFiles(message: string, files: FileInfo[] = []) {
    if (files.length === 0) {
      this.addUser(message);
      return;
    }

    const content: ChatContent[] = [
      { type: "text", text: message } as ChatContentText,
    ];

    for (const file of files) {
      content.push({ type: "file", file } as ChatContentFile);
    }

    this.messages.push({ role: "user", content });
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

  hasFiles(): boolean {
    return this.messages.some(
      (msg) =>
        Array.isArray(msg.content) &&
        msg.content.some((item) => item.type === "file"),
    );
  }

  getTextContent(content: string | ChatContent[]): string {
    if (typeof content === "string") {
      return content;
    }

    const textParts = content
      .filter((item) => item.type === "text")
      .map((item) => (item as ChatContentText).text);

    return textParts.join(" ");
  }

  getFiles(content: string | ChatContent[]): FileInfo[] {
    if (typeof content === "string") {
      return [];
    }

    return content
      .filter((item) => item.type === "file")
      .map((item) => (item as ChatContentFile).file);
  }

  toString() {
    return JSON.stringify({
      system: this.system,
      messages: this.messages,
      tools: this.tools,
    });
  }
}
