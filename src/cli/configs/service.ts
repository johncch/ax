import { ServiceConfig, ValidationError, BraveProviderConfig } from "./types.js";

export function isServiceConfig(
  config: any,
  error?: ValidationError,
): config is ServiceConfig {
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

    // "rateLimit" is optional but must be a number if provided.
    if ("rateLimit" in brave && typeof brave.rateLimit !== "number") {
      error && (error.value = "Config: brave.rateLimit must be a number");
      return false;
    }
  }

  return true;
}
