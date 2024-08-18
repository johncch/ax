import { ProgramOptions } from "../index.js";
import { Config } from "../utils/config.js";
import { Using } from "../utils/job.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";
import { AIProvider } from "./types.js";

export function getEngine(
  engine: Using,
  config: Config,
  options: ProgramOptions,
): AIProvider | null {
  if (engine.engine == "openai") {
    return new OpenAIProvider(engine.model, config, options);
  }
  if (engine.engine == "anthropic") {
    return new AnthropicProvider(engine.model, config);
  }
  return null;
}
