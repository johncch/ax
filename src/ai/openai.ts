import OpenAI from "openai";

import { Recorder } from "../recorder/recorder.js";
import { Chat } from "./chat.js";
import {
  AIProvider,
  AIProviderStopReason,
  AIRequest,
  AIResponse,
} from "./types.js";

/**
 * This is a convenience constant dictionary that exposes the
 * most common OpenAI models that this library may use.
 */
export const Models = {
  GPT_4_1: "gpt-4.1",
  GPT_4_1_MINI: "gpt-4.1-mini",
  GPT_4_1_NANO: "gpt-4.1-nano",
  GPT_4O: "gpt-4o",
  O3_MINI: "o3-mini",
  O4_MINI: "o4-mini",
} as const;

const DEFAULT_MODEL = Models.GPT_4_1;

export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  client: OpenAI;
  model: string | undefined;

  constructor(
    private apiKey: string,
    model?: string | undefined,
  ) {
    this.model = model || DEFAULT_MODEL;
    this.client = new OpenAI({ apiKey: apiKey });
  }

  createChatCompletionRequest(chat: Chat) {
    return new OpenAIChatCompletionRequest(this, chat);
  }
}

class OpenAIChatCompletionRequest implements AIRequest {
  constructor(
    private provider: OpenAIProvider,
    private chat: Chat,
  ) {}

  async execute(runtime: { recorder?: Recorder }): Promise<AIResponse> {
    const { recorder } = runtime;
    const { client, model } = this.provider;
    const request = {
      model: model,
      ...this.chat.toOpenAI(),
    };
    recorder?.debug?.log(request);

    let result: AIResponse;
    try {
      const completion = await client.chat.completions.create(request);
      result = translate(completion);
    } catch (e) {
      recorder?.error?.log(e);
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
    recorder?.debug?.log(result);
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
      arguments: call.function.arguments,
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
