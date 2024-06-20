import { OpenAIProvider } from "./openai.js";

export function getEngine(engine, config, options) {
  if (engine == "openai") {
    return new OpenAIProvider(config, options);
  }
  return null;
}
