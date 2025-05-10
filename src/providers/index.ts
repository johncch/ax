import { ProviderConfig, Using } from "../configs/types.js";
import { Recorder } from "../recorder/recorder.js";
import { ProgramOptions } from "../types.js";
import { AnthropicProvider } from "./anthropic.js";
import { OllamaProvider } from "./ollama.js";
import { OpenAIProvider } from "./openai.js";
import { AIProvider } from "./types.js";

export function getProvider(
  engine: Using,
  config: ProviderConfig,
  options?: ProgramOptions,
  recorder?: Recorder,
): AIProvider {
  if (engine.engine == "openai") {
    return new OpenAIProvider(config.openai, engine, recorder);
  }
  if (engine.engine == "anthropic") {
    return new AnthropicProvider(config.anthropic, engine, recorder);
  }
  if (engine.engine == "ollama") {
    return new OllamaProvider(config.ollama, engine, recorder);
  }

  throw new Error(
    "AI Provider is invalid or not supported. Please check your job file.",
  );
}
