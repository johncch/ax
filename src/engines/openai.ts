import OpenAI from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions.mjs";
import { ProgramOptions } from "../index.js";
import { Config } from "../utils/config";
import { AIProvider, AIRequest, AIResponse, ChatItem } from "./index.js";

export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  openai: OpenAI;
  model: string | undefined;

  constructor(
    model: string | undefined,
    config: Config,
    options: ProgramOptions,
  ) {
    this.model = model;
    this.openai = new OpenAI({ apiKey: config.providers.openai["api-key"] });
  }

  createChatCompletionRequest(messages: ChatItem[]) {
    return new OpenAIRequest(this.openai, this.model, messages);
  }
}

class OpenAIRequest implements AIRequest {
  messages = {};
  openai: OpenAI;
  model: string;

  constructor(openai: OpenAI, model: string | undefined, messages: ChatItem[]) {
    this.openai = openai;
    this.model = model || "gpt-4o";
    this.messages = messages;
  }

  async execute(): Promise<AIResponse> {
    // The implementation right now does not wait for user prompt
    // We'll add features as we need them
    const promise = new Promise<any>(async (resolve, reject) => {
      const messages = this.messages;

      const chat_completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
      } as ChatCompletionCreateParamsNonStreaming);

      const response = translate(chat_completion);
      resolve(response);
    });

    return promise;
  }
}

function translate(
  completion: OpenAI.Chat.Completions.ChatCompletion,
): AIResponse {
  const choice = completion.choices[0];
  return {
    type: "success",
    id: completion.id,
    model: completion.model,
    reason: choice.finish_reason,
    message: {
      content: choice.message.content,
      role: choice.message.role,
    },
    usage: {
      in: completion.usage?.prompt_tokens ?? 0,
      out: completion.usage?.completion_tokens ?? 0,
    },
    raw: completion,
  };
}
