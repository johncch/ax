import { ProviderConfig, Using } from "../cli/configs/types.js";
import { Recorder } from "../recorder/recorder.js";
import { ProgramOptions } from "../types.js";
import { AnthropicProvider } from "./anthropic.js";
import { OllamaProvider } from "./ollama.js";
import { OpenAIProvider } from "./openai.js";
import { AIProvider } from "./types.js";

export function getProvider({
  useConfig,
  config,
  options,
  recorder,
}: {
  useConfig: Using;
  config: ProviderConfig;
  options?: ProgramOptions;
  recorder?: Recorder;
}): AIProvider {
  if (useConfig.engine == "openai") {
    return new OpenAIProvider({
      config: config.openai,
      use: useConfig,
      recorder,
    });
  }
  if (useConfig.engine == "anthropic") {
    return new AnthropicProvider({
      config: config.anthropic,
      use: useConfig,
      recorder,
    });
  }
  if (useConfig.engine == "ollama") {
    return new OllamaProvider({
      config: config.ollama,
      use: useConfig,
      recorder,
    });
  }

  throw new Error(
    "AI Provider is invalid or not supported. Please check your job file.",
  );
}
