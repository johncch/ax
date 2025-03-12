import { ProviderConfig, Using } from "../configs/types.js";
import { ProgramOptions } from "../types.js";
import { AnthropicProvider } from "./anthropic.js";
import { OllamaProvider } from "./ollama.js";
import { OpenAIProvider } from "./openai.js";
import { AIProvider } from "./types.js";

export function getProvider(
  engine: Using,
  config: ProviderConfig,
  options: ProgramOptions,
): AIProvider {
  if (engine.engine == "openai") {
    return new OpenAIProvider(config.openai, engine);
  }
  if (engine.engine == "anthropic") {
    return new AnthropicProvider(config.anthropic, engine);
  }
  if (engine.engine == "ollama") {
    return new OllamaProvider(config.ollama, engine);
  }

  throw new Error(
    "AI Provider is invalid or not supported. Please check your job file.",
  );
}
