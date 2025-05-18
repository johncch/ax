import { Recorder } from "../recorder/recorder.js";
import { Chat } from "./chat.js";
import {
  AIProvider,
  AIProviderStopReason,
  AIRequest,
  AIResponse,
} from "./types.js";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

export class OllamaProvider implements AIProvider {
  name = "Ollama";
  url: string;
  model: string;
  recorder?: Recorder;

  constructor(model: string, url?: string) {
    this.url = url || DEFAULT_OLLAMA_URL;
    this.model = model;
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

  async execute(runtime: { recorder?: Recorder }): Promise<AIResponse> {
    const { recorder } = runtime;
    const requestBody = {
      model: this.model,
      messages: this.chat.toOpenAI().messages,
      stream: false,
      options: {
        temperature: 0.7,
      },
    };

    recorder?.debug?.log(requestBody);

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
      recorder?.error?.log("Error fetching Ollama response:", e);
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

    recorder?.debug?.log(result);
    return result;
  }
}
