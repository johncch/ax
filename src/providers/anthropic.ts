import Anthropic from "@anthropic-ai/sdk";
import { Config } from "../utils/config.js";
import { Display } from "../utils/display.js";
import {
  AIProvider,
  AIProviderStopReason,
  AIRequest,
  AIResponse,
  Chat,
  ToolCall,
} from "./types.js";

export class AnthropicProvider implements AIProvider {
  name = "Anthropic";
  client: Anthropic;
  model: string;

  constructor(model: string | undefined, config: Config) {
    this.model = model ?? "claude-3-5-sonnet-20240620";
    this.client = new Anthropic({
      apiKey: config.providers.anthropic["api-key"],
    });
  }

  createChatCompletionRequest(chat: Chat): AIRequest {
    return new AnthropicChatRequest(this.client, this.model, chat);
  }
}

class AnthropicChatRequest implements AIRequest {
  chat: Chat;
  client: Anthropic;
  model: string;

  constructor(client: Anthropic, model: string, chat: Chat) {
    this.client = client;
    this.model = model;
    this.chat = chat;
  }

  async execute(): Promise<any> {
    const request = {
      model: this.model,
      ...this.chat.toAnthropic(),
      max_tokens: getMaxTokens(this.model),
    };
    Display.debug.log(request);

    let result: AIResponse;
    try {
      const completion = await this.client.messages.create(request);
      result = translate(completion);
    } catch (e) {
      result = {
        type: "error",
        error: {
          type: e.error.error.type ?? "Undetermined",
          message: e.error.error.message ?? "Unexpected error from Anthropic",
        },
        usage: {
          in: 0,
          out: 0,
        },
        raw: e,
      };
    }

    Display.debug.log(result);
    return result;
  }
}

function getMaxTokens(model: string): number {
  switch (model) {
    case "claude-3-5-sonnet-20240620":
      return 4096;
    case "claude-3-opus-20240229":
      return 4096;
    case "claude-3-sonnet-20240229":
      return 4096;
    case "claude-3-haiku-20240307":
      return 4096;
    default:
      return 4096;
  }
}

/**
 * Translate an Anthropic completion into a standard (OpenAI) response.
 */
function getStopReason(reason: string) {
  switch (reason) {
    case "max_tokens":
      return AIProviderStopReason.Length;
    case "end_turn":
      return AIProviderStopReason.Stop;
    case "stop_sequence":
      return AIProviderStopReason.Stop;
    case "tool_use":
      return AIProviderStopReason.FunctionCall;
    default:
      return AIProviderStopReason.Error;
  }
}

function translate(completion: Anthropic.Messages.Message): AIResponse {
  const stopReason = getStopReason(completion.stop_reason);
  if (stopReason === AIProviderStopReason.Error) {
    return {
      type: "error",
      error: {
        type: "Uncaught error",
        message: "Stop reason is not recognized.",
      },
      usage: {
        in: completion.usage.input_tokens,
        out: completion.usage.output_tokens,
      },
      raw: completion,
    };
  }

  if (stopReason === AIProviderStopReason.FunctionCall) {
    const content = completion.content[0];
    const contentText = content.type === "text" ? content.text : "";

    const toolCalls = completion.content
      .slice(1)
      .map((toolUse) => {
        if (toolUse.type === "tool_use") {
          return {
            id: toolUse.id,
            name: toolUse.name,
            arguments: toolUse.input,
          };
        }
      })
      .filter((v): v is ToolCall => v !== null);

    return {
      type: "success",
      id: completion.id,
      model: completion.model,
      reason: AIProviderStopReason.FunctionCall,
      message: {
        role: completion.role,
        content: contentText,
        toolCalls: toolCalls,
      },
      usage: {
        in: completion.usage.input_tokens,
        out: completion.usage.output_tokens,
      },
      raw: completion,
    };
  }

  if (completion.type == "message") {
    const content = completion.content[0];
    if (content.type == "text") {
      return {
        type: "success",
        id: completion.id,
        model: completion.model,
        reason: getStopReason(completion.stop_reason),
        message: {
          role: completion.role,
          content: content.text,
        },
        usage: {
          in: completion.usage.input_tokens,
          out: completion.usage.output_tokens,
        },
        raw: completion,
      };
    }
  }
}
