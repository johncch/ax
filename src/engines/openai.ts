import OpenAI from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions.mjs";
import { ProgramOptions } from "../index.js";
import { Config } from "../utils/config";
import { AIProvider, AIRequest, AIResponse, ChatItem } from "./index.js";
import { Display } from "../utils/display.js";

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
    const request = {
      model: this.model,
      messages: this.messages,
    } as ChatCompletionCreateParamsNonStreaming;

    Display.debug.log(request);
    const chat_completion = await this.openai.chat.completions.create(request);
    Display.debug.log(chat_completion);
    const response = translate(chat_completion);
    return response;
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
