import { assertIsOllamaProviderConfig } from "../cli/configs/service.js";
import { OllamaProviderConfig, OllamaUse } from "../cli/configs/types.js";
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

  constructor({
    config,
    use,
    recorder,
  }: {
    config: Partial<OllamaProviderConfig>;
    use: OllamaUse;
    recorder?: Recorder;
  }) {
    const c = {
      model: config.model ?? use.model,
      url: config.url ?? use.url ?? DEFAULT_OLLAMA_URL,
    };

    try {
      assertIsOllamaProviderConfig(c);
      this.url = c.url;
      this.model = c.model;
      this.recorder = recorder;
    } catch (e) {
      throw new Error(`Invalid Ollama configuration: ${e}`);
    }
  }

  createChatCompletionRequest(chat: Chat): AIRequest {
    return new OllamaChatCompletionRequest({
      url: this.url,
      model: this.model,
      chat,
      recorder: this.recorder,
    });
  }
}

class OllamaChatCompletionRequest implements AIRequest {
  chat: Chat;
  url: string;
  model: string;
  recorder?: Recorder;

  constructor({
    url,
    model,
    chat,
    recorder,
  }: {
    url: string;
    model: string;
    chat: Chat;
    recorder?: Recorder;
  }) {
    this.url = url;
    this.model = model;
    this.chat = chat;
    this.recorder = recorder;
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

    this.recorder?.debug?.log(requestBody);

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

    this.recorder?.debug?.log(result);
    return result;
  }
}
