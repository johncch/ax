import { assertIsOllamaProviderConfig } from "../configs/service.js";
import { OllamaProviderConfig, OllamaUse } from "../configs/types.js";
import { Display } from "../utils/display.js";
import { Chat } from "./chat.js";
import {
  AIProvider,
  AIProviderStopReason,
  AIRequest,
  AIResponse,
} from "./types.js";

const DEFAULT_URL = "http://localhost:11434";

export class OllamaProvider implements AIProvider {
  readonly name = "Ollama";
  url: string;
  model: string;

  constructor(config: Partial<OllamaProviderConfig>, use: OllamaUse) {
    const c = {
      model: config.model ?? use.model,
      url: config.url ?? use.url ?? DEFAULT_URL,
    };

    try {
      assertIsOllamaProviderConfig(c);
      this.url = c.url;
      this.model = c.model;
    } catch (e) {
      throw new Error(`Invalid Ollama configuration: ${e}`);
    }
  }

  createChatCompletionRequest(chat: Chat): AIRequest {
    return new OllamaChatCompletionRequest(this.url, this.model, chat);
  }
}

class OllamaChatCompletionRequest implements AIRequest {
  chat: Chat;
  url: string;
  model: string;

  constructor(url: string, model: string, chat: Chat) {
    this.url = url;
    this.model = model;
    this.chat = chat;
  }

  async execute(): Promise<AIResponse> {
    const requestBody = {
      model: this.model,
      messages: this.chat.toOpenAI().messages,
      stream: false,
      options: {
        temperature: 0.7,
      },
    };

    Display.debug.log(requestBody);

    let result: AIResponse;
    try {
      const response = await fetch(`${this.url}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      result = {
        type: "success",
        id: `ollama-${Date.now()}`,
        model: this.model,
        reason: AIProviderStopReason.Stop,
        message: {
          role: "assistant",
          content: data.message?.content || "",
        },
        usage: {
          in: data.prompt_eval_count || 0,
          out: data.eval_count || 0,
        },
        raw: data,
      };
    } catch (e) {
      console.log(e);
      result = {
        type: "error",
        error: {
          type: "OllamaError",
          message: e.message || "Unexpected error from Ollama",
        },
        usage: {
          in: 0,
          out: 0,
        },
        raw: JSON.stringify(e),
      };
    }

    Display.debug.log(result);
    return result;
  }
}
