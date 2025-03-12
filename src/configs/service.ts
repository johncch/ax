import YAML from "yaml";
import { ProgramOptions } from "../types.js";
import { Display } from "../utils/display.js";
import { loadFile } from "../utils/file.js";
import {
  AnthropicProviderConfig,
  OllamaProviderConfig,
  OpenAIProviderConfig,
  ProviderConfig,
  ValidationError,
} from "./types.js";

const DEFAULT_CONFIG_NAME = "ax.config";
const DEFAULT_CONFIG_FORMATS = ["yaml", "yml", "json"];

export async function getProviderConfig(
  configPath: string | null,
  options: ProgramOptions,
): Promise<ProviderConfig> {
  const { content, format } = await loadFile(
    configPath,
    {
      name: DEFAULT_CONFIG_NAME,
      formats: DEFAULT_CONFIG_FORMATS,
    },
    "Config File",
  );

  let result: any = null;
  if (format === "json") {
    result = JSON.parse(content);
  } else if (format === "yaml" || format === "yml") {
    result = YAML.parse(content);
  } else {
    throw new Error("Invalid config file format");
  }
  Display.debug.group("The Config Object");
  Display.debug.log(result);

  const valError = { value: "" };
  if (isProviderConfig(result, valError)) {
    return result;
  }

  throw new Error(valError.value);
}

/*
 * Validation functions
 */

export function isProviderConfig(
  config: any,
  error?: ValidationError,
): config is ProviderConfig {
  // Must be a non-null object.
  if (typeof config !== "object" || config === null) {
    error && (error.value = "Config: must be a non-null object");
    return false;
  }

  // Validate "openai" configuration if provided.
  if ("openai" in config) {
    const openai = config.openai;
    if (typeof openai !== "object" || openai === null) {
      error && (error.value = "Config: openai must be an object");
      return false;
    }
    // "api-key" is required.
    if (typeof openai["api-key"] !== "string") {
      error && (error.value = "Config: openai.api-key must be a string");
      return false;
    }

    // Optional "model", if provided, must be a string.
    if ("model" in openai && typeof openai.model !== "string") {
      error && (error.value = "Config: openai.model must be a string");
      return false;
    }
  }

  // Validate "anthropic" configuration if provided.
  if ("anthropic" in config) {
    const anthropic = config.anthropic;
    if (typeof anthropic !== "object" || anthropic === null) {
      error && (error.value = "Config: anthropic must be an object");
      return false;
    }

    if (typeof anthropic["api-key"] !== "string") {
      error && (error.value = "Config: anthropic.api-key must be a string");
      return false;
    }

    if ("model" in anthropic && typeof anthropic.model !== "string") {
      error && (error.value = "Config: anthropic.model must be a string");
      return false;
    }
  }

  // Validate "ollama" configuration if provided.
  if ("ollama" in config) {
    const ollama = config.ollama;
    if (typeof ollama !== "object" || ollama === null) {
      error && (error.value = "Config: ollama must be an object");
      return false;
    }

    // Both "url" and "model" are optional, but if present must be strings.
    if ("url" in ollama && typeof ollama.url !== "string") {
      error && (error.value = "Config: ollama.url must be a string");
      return false;
    }

    if ("model" in ollama && typeof ollama.model !== "string") {
      error && (error.value = "Config: ollama.model must be a string");
      return false;
    }
  }

  // Validate "brave" configuration if provided.
  if ("brave" in config) {
    const brave = config.brave;
    if (typeof brave !== "object" || brave === null) {
      error && (error.value = "Config: brave must be an object");
      return false;
    }

    if (typeof brave["api-key"] !== "string") {
      error && (error.value = "Config: brave.api-key must be a string");
      return false;
    }

    // "delay" is optional but must be a number if provided.
    if ("delay" in brave && typeof brave.delay !== "number") {
      error && (error.value = "Config: brave.delay must be a number");
      return false;
    }
  }

  return true;
}

export function assertIsOpenAIProviderConfig(
  obj: any,
): asserts obj is OpenAIProviderConfig {
  if (!obj || typeof obj !== "object") {
    throw new Error("Not an object");
  }

  if (!("api-key" in obj) || typeof obj["api-key"] !== "string") {
    throw new Error("Missing or invalid 'api-key'");
  }

  if (!("model" in obj) || typeof obj.model !== "string") {
    throw new Error("Missing or invalid 'model'");
  }
}

export function assertIsAnthropicProviderConfig(
  obj: any,
): asserts obj is AnthropicProviderConfig {
  if (!obj || typeof obj !== "object") {
    throw new Error("Not an object");
  }

  if (!("api-key" in obj) || typeof obj["api-key"] !== "string") {
    throw new Error("Missing or invalid 'api-key'");
  }

  if (!("model" in obj) || typeof obj.model !== "string") {
    throw new Error("Missing or invalid 'model'");
  }
}

export function assertIsOllamaProviderConfig(
  obj: any,
): asserts obj is OllamaProviderConfig {
  if (!obj || typeof obj !== "object") {
    throw new Error("Not an object");
  }

  if (!("url" in obj) || typeof obj.url !== "string") {
    throw new Error("Missing or invalid 'url'");
  }

  if (!("model" in obj) || typeof obj.model !== "string") {
    throw new Error("Missing or invalid 'model'");
  }
}
