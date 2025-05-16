import Anthropic from "@anthropic-ai/sdk";
import { assertIsAnthropicProviderConfig } from "../cli/configs/service.js";
import { AnthropicProviderConfig, AnthropicUse } from "../cli/configs/types.js";
import { Recorder } from "../recorder/recorder.js";

import { Chat } from "./chat.js";
import {
  AIProvider,
  AIProviderStopReason,
  AIRequest,
  AIResponse,
  ToolCall,
} from "./types.js";

const Models = {
  CLAUDE_3_7_SONNET_LATEST: "claude-3-7-sonnet-latest",
  CLAUDE_3_7_SONNET_20250219: "claude-3-7-sonnet-20250219",
  CLAUDE_3_5_HAIKU_LATEST: "claude-3-5-haiku-latest",
  CLAUDE_3_5_HAIKU_20241022: "claude-3-5-haiku-20241022",
};

const DEFAULT_MODEL = Models.CLAUDE_3_5_HAIKU_LATEST;

export class AnthropicProvider implements AIProvider {
  name = "Anthropic";
  client: Anthropic;
  model: string;
  recorder?: Recorder;

  constructor({
    config,
    use,
    recorder,
  }: {
    config: Partial<AnthropicProviderConfig>;
    use: AnthropicUse;
    recorder?: Recorder;
  }) {
    const c = {
      ["api-key"]: config["api-key"] || use["api-key"],
      model: config.model || use.model || DEFAULT_MODEL,
    };

    try {
      assertIsAnthropicProviderConfig(c);
      this.model = c.model;
      this.client = new Anthropic({
        apiKey: c["api-key"],
      });
      this.recorder = recorder;
    } catch (e) {
      throw new Error(`Invalid Anthropic configuration: ${e}`);
    }
  }

  createChatCompletionRequest(chat: Chat): AIRequest {
    return new AnthropicChatRequest({
      client: this.client,
      model: this.model,
      chat,
      recorder: this.recorder,
    });
  }
}

class AnthropicChatRequest implements AIRequest {
  chat: Chat;
  client: Anthropic;
  model: string;
  recorder?: Recorder;

  constructor({
    client,
    model,
    chat,
    recorder,
  }: {
    client: Anthropic;
    model: string;
    chat: Chat;
    recorder?: Recorder;
  }) {
    this.client = client;
    this.model = model;
    this.chat = chat;
    this.recorder = recorder;
  }

  async execute(): Promise<any> {
    const request = {
      model: this.model,
      ...this.chat.toAnthropic(),
      max_tokens: getMaxTokens(this.model),
    };
    this.recorder?.debug?.log(request);

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

    this.recorder?.debug?.log(result);
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
