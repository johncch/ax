import OpenAI from "openai";
import { assertIsOpenAIProviderConfig } from "../configs/service.js";
import { OpenAIProviderConfig, OpenAIUse } from "../configs/types.js";
import { Display } from "../utils/display.js";
import { Chat } from "./chat.js";
import {
  AIProvider,
  AIProviderStopReason,
  AIRequest,
  AIResponse,
} from "./types.js";

const DEFAULT_MODEL = "gpt-4o";

export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  client: OpenAI;
  model: string | undefined;

  constructor(config: Partial<OpenAIProviderConfig>, use: OpenAIUse) {
    const c = {
      ["api-key"]: config["api-key"] || use["api-key"],
      model: config.model || use.model || DEFAULT_MODEL,
    };

    try {
      assertIsOpenAIProviderConfig(c);
      this.model = c.model;
      this.client = new OpenAI({ apiKey: c["api-key"] });
    } catch (e) {
      throw new Error(`Invalid OpenAI configuration: ${e}`);
    }
  }

  createChatCompletionRequest(chat: Chat) {
    return new OpenAIChatCompletionRequest(this.client, this.model, chat);
  }
}

class OpenAIChatCompletionRequest implements AIRequest {
  chat: Chat;
  openai: OpenAI;
  model: string;

  constructor(openai: OpenAI, model: string | undefined, chat: Chat) {
    this.openai = openai;
    this.model = model || "gpt-4o";
    this.chat = chat;
  }

  async execute(): Promise<AIResponse> {
    const request = {
      model: this.model,
      ...this.chat.toOpenAI(),
    };
    Display.debug.log(request);

    let result: AIResponse;
    try {
      const completion = await this.openai.chat.completions.create(request);
      result = translate(completion);
    } catch (e) {
      console.error(e);
      result = {
        type: "error",
        error: {
          type: e.type ?? "Undetermined",
          message: e.message ?? "Unexpected error from OpenAI",
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

function getStopReason(reason: string) {
  switch (reason) {
    case "length":
      return AIProviderStopReason.Length;
    case "stop":
      return AIProviderStopReason.Stop;
    case "tool_calls":
      return AIProviderStopReason.FunctionCall;
    default:
      return AIProviderStopReason.Error;
  }
}

function translate(
  completion: OpenAI.Chat.Completions.ChatCompletion,
): AIResponse {
  if (completion.choices.length > 0) {
    const choice = completion.choices[0];
    const toolCalls = choice.message.tool_calls?.map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: JSON.parse(call.function.arguments),
    }));

    return {
      type: "success",
      id: completion.id,
      model: completion.model,
      reason: getStopReason(choice.finish_reason),
      message: {
        content: choice.message.content ?? "",
        role: choice.message.role,
        toolCalls: toolCalls,
      },
      usage: {
        in: completion.usage?.prompt_tokens ?? 0,
        out: completion.usage?.completion_tokens ?? 0,
      },
      raw: completion,
    };
  }

  return {
    type: "error",
    error: {
      type: "undetermined",
      message: "Unexpected response from OpenAI",
    },
    usage: {
      in: completion.usage?.prompt_tokens ?? 0,
      out: completion.usage?.completion_tokens ?? 0,
    },
    raw: completion,
  };
}
