import {
  MessageParam,
  TextBlockParam,
  Tool,
  ToolResultBlockParam,
  ToolUseBlockParam,
} from "@anthropic-ai/sdk/resources/index.mjs";
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/resources/index.mjs";
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

  toOpenAI() {
    const systemMsg = [];
    if (this.system) {
      systemMsg.push({
        role: "system" as const,
        content: this.system,
      });
    }

    const tools =
      this.tools.length > 0
        ? this.tools.map((schema) => {
            return {
              type: "function",
              function: schema,
            } satisfies ChatCompletionTool;
          })
        : undefined;

    const messages = this.messages
      .map((msg) => {
        switch (msg.role) {
          case "tool":
            return msg.content.map((r) => ({
              role: "tool",
              tool_call_id: r.id,
              content: r.content,
            })) satisfies ChatCompletionToolMessageParam[];

          case "assistant":
            return {
              role: msg.role,
              content: msg.content,
              tool_calls: msg.toolCalls.map((call) => ({
                id: call.id,
                type: "function",
                function: {
                  name: call.name,
                  arguments: JSON.stringify(call.arguments),
                },
              })),
            } satisfies ChatCompletionAssistantMessageParam;

          default:
            return {
              role: msg.role,
              content: msg.content,
            } satisfies ChatCompletionUserMessageParam;
        }
      })
      .flat(Infinity) as Array<ChatCompletionMessageParam>;

    return {
      messages: [...systemMsg, ...messages],
      ...(tools && { tools }),
    } satisfies {
      messages: Array<ChatCompletionMessageParam>;
      tools?: Array<ChatCompletionTool>;
    };
  }

  toAnthropic(): {
    system: string;
    messages: Array<MessageParam>;
    tools: Tool[];
  } {
    const messages = this.messages.map((msg) => {
      switch (msg.role) {
        case "assistant":
          const content: Array<TextBlockParam | ToolUseBlockParam> = [];
          content.push({ type: "text", text: msg.content });
          if (msg.toolCalls) {
            content.push(
              ...msg.toolCalls.map(
                (call) =>
                  ({
                    type: "tool_use",
                    id: call.id,
                    name: call.name,
                    input: call.arguments,
                  }) satisfies ToolUseBlockParam,
              ),
            );
          }
          return {
            role: "assistant",
            content,
          };

        case "tool":
          return {
            role: "user",
            content: msg.content.map((r) => ({
              type: "tool_result",
              tool_use_id: r.id,
              content: r.content,
            })) satisfies Array<ToolResultBlockParam>,
          } satisfies MessageParam;

        default:
          return {
            role: "user",
            content: msg.content,
          } satisfies MessageParam;
      }
    }) satisfies Array<MessageParam>;

    const tools = this.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    return {
      system: this.system,
      messages: messages,
      tools: tools,
    };
  }

  toString() {
    return JSON.stringify({
      system: this.system,
      messages: this.messages,
      tools: this.tools,
    });
  }
}
