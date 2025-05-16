import {
  AnthropicUse,
  BatchJob,
  ChatStep,
  Job,
  JobConfig,
  OllamaUse,
  OpenAIUse,
  Replace,
  SerialJob,
  SkipOptions,
  Step,
  Using,
  ValidationError,
  WriteToDiskStep,
} from "./types.js";

export function isJobConfig(
  obj: any,
  errVal?: ValidationError,
): obj is JobConfig {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (!isUsing(obj.using, errVal)) {
    if (errVal) errVal.value = `Invalid 'using' property: ${errVal?.value}`;
    return false;
  }

  if (!obj.jobs || typeof obj.jobs !== "object") {
    if (errVal) errVal.value = "Missing or invalid 'jobs' property";
    return false;
  }

  // Check that all jobs are valid Job objects
  for (const [key, value] of Object.entries(obj.jobs)) {
    if (!isJob(value, errVal)) {
      if (errVal) errVal.value = `Invalid job '${key}': ${errVal?.value}`;
      return false;
    }
  }

  return true;
}

export function isUsing(obj: any, errVal?: ValidationError): obj is Using {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.engine === "openai") {
    return isOpenAIUse(obj, errVal);
  } else if (obj.engine === "anthropic") {
    return isAnthropicUse(obj, errVal);
  } else if (obj.engine === "ollama") {
    return isOllamaUse(obj, errVal);
  } else {
    if (errVal)
      errVal.value =
        "Invalid engine type. Must be 'openai', 'anthropic', or 'ollama'";
    return false;
  }
}

export function isOpenAIUse(
  obj: any,
  errVal?: ValidationError,
): obj is OpenAIUse {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.engine !== "openai") {
    if (errVal) errVal.value = "Engine must be 'openai'";
    return false;
  }

  // Optional properties
  if (obj["api-key"] !== undefined && typeof obj["api-key"] !== "string") {
    if (errVal) errVal.value = "Property 'api-key' must be a string";
    return false;
  }

  if (obj.model !== undefined && typeof obj.model !== "string") {
    if (errVal) errVal.value = "Property 'model' must be a string";
    return false;
  }

  return true;
}

export function isAnthropicUse(
  obj: any,
  errVal?: ValidationError,
): obj is AnthropicUse {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.engine !== "anthropic") {
    if (errVal) errVal.value = "Engine must be 'anthropic'";
    return false;
  }

  // Optional properties
  if (obj["api-key"] !== undefined && typeof obj["api-key"] !== "string") {
    if (errVal) errVal.value = "Property 'api-key' must be a string";
    return false;
  }

  if (obj.model !== undefined && typeof obj.model !== "string") {
    if (errVal) errVal.value = "Property 'model' must be a string";
    return false;
  }

  return true;
}

export function isOllamaUse(
  obj: any,
  errVal?: ValidationError,
): obj is OllamaUse {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.engine !== "ollama") {
    if (errVal) errVal.value = "Engine must be 'ollama'";
    return false;
  }

  // Optional properties
  if (obj.url !== undefined && typeof obj.url !== "string") {
    if (errVal) errVal.value = "Property 'url' must be a string";
    return false;
  }

  if (obj.model !== undefined && typeof obj.model !== "string") {
    if (errVal) errVal.value = "Property 'model' must be a string";
    return false;
  }

  return true;
}

export function isJob(obj: any, errVal?: ValidationError): obj is Job {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.type === "serial") {
    return isSerialJob(obj, errVal);
  } else if (obj.type === "batch") {
    return isBatchJob(obj, errVal);
  } else {
    if (errVal) errVal.value = "Job type must be 'serial' or 'batch'";
    return false;
  }
}

export function isSerialJob(
  obj: any,
  errVal?: ValidationError,
): obj is SerialJob {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.type !== "serial") {
    if (errVal) errVal.value = "Job type must be 'serial'";
    return false;
  }

  // Check tools if provided
  if (obj.tools !== undefined) {
    if (!Array.isArray(obj.tools)) {
      if (errVal) errVal.value = "Property 'tools' must be an array";
      return false;
    }

    for (const tool of obj.tools) {
      if (typeof tool !== "string") {
        if (errVal) errVal.value = "All tools must be strings";
        return false;
      }
    }
  }

  // Check steps
  if (!Array.isArray(obj.steps)) {
    if (errVal) errVal.value = "Property 'steps' must be an array";
    return false;
  }

  for (let i = 0; i < obj.steps.length; i++) {
    if (!isStep(obj.steps[i], errVal)) {
      if (errVal) errVal.value = `Invalid step at index ${i}: ${errVal?.value}`;
      return false;
    }
  }

  return true;
}

export function isBatchJob(
  obj: any,
  errVal?: ValidationError,
): obj is BatchJob {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.type !== "batch") {
    if (errVal) errVal.value = "Job type must be 'batch'";
    return false;
  }

  // Check tools if provided
  if (obj.tools !== undefined) {
    if (!Array.isArray(obj.tools)) {
      if (errVal) errVal.value = "Property 'tools' must be an array";
      return false;
    }

    for (const tool of obj.tools) {
      if (typeof tool !== "string") {
        if (errVal) errVal.value = "All tools must be strings";
        return false;
      }
    }
  }

  // Check batch
  if (!Array.isArray(obj.batch)) {
    if (errVal) errVal.value = "Property 'batch' must be an array";
    return false;
  }

  for (let i = 0; i < obj.batch.length; i++) {
    const batchItem = obj.batch[i];

    if (!batchItem || typeof batchItem !== "object") {
      if (errVal) errVal.value = `Batch item at index ${i} must be an object`;
      return false;
    }

    if (batchItem.type !== "files") {
      if (errVal)
        errVal.value = `Batch item at index ${i} must have type 'files'`;
      return false;
    }

    if (typeof batchItem.source !== "string") {
      if (errVal)
        errVal.value = `Batch item at index ${i} must have a string 'source' property`;
      return false;
    }

    if (typeof batchItem.bind !== "string") {
      if (errVal)
        errVal.value = `Batch item at index ${i} must have a string 'bind' property`;
      return false;
    }

    // Check skip-if if provided
    if (batchItem["skip-if"] !== undefined) {
      if (!Array.isArray(batchItem["skip-if"])) {
        if (errVal)
          errVal.value = `Batch item at index ${i} must have an array 'skip-if' property`;
        return false;
      }

      for (let j = 0; j < batchItem["skip-if"].length; j++) {
        if (!isSkipOptions(batchItem["skip-if"][j], errVal)) {
          if (errVal)
            errVal.value = `Invalid skip condition at index ${j} in batch item ${i}: ${errVal?.value}`;
          return false;
        }
      }
    }
  }

  // Check steps
  if (!Array.isArray(obj.steps)) {
    if (errVal) errVal.value = "Property 'steps' must be an array";
    return false;
  }

  for (let i = 0; i < obj.steps.length; i++) {
    if (!isStep(obj.steps[i], errVal)) {
      if (errVal) errVal.value = `Invalid step at index ${i}: ${errVal?.value}`;
      return false;
    }
  }

  return true;
}

export function isSkipOptions(
  obj: any,
  errVal?: ValidationError,
): obj is SkipOptions {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.type !== "file-exist") {
    if (errVal) errVal.value = "Property 'type' must be 'file-exist'";
    return false;
  }

  if (typeof obj.pattern !== "string") {
    if (errVal) errVal.value = "Property 'pattern' must be a string";
    return false;
  }

  return true;
}

export function isStep(obj: any, errVal?: ValidationError): obj is Step {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (!obj.uses || typeof obj.uses !== "string") {
    if (errVal) errVal.value = "Step must have a string 'uses' property";
    return false;
  }

  if (obj.uses === "chat") {
    return isChatStep(obj, errVal);
  } else if (obj.uses === "write-to-disk") {
    return isWriteToDiskStep(obj, errVal);
  } else {
    if (errVal) errVal.value = `Unknown uses type: ${obj.uses}`;
    return false;
  }
}

export function isChatStep(
  obj: any,
  errVal?: ValidationError,
): obj is ChatStep {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.uses !== "chat") {
    if (errVal) errVal.value = "Uses must be 'chat'";
    return false;
  }

  if (typeof obj.message !== "string") {
    if (errVal) errVal.value = "Property 'message' must be a string";
    return false;
  }

  // Check system if provided
  if (obj.system !== undefined && typeof obj.system !== "string") {
    if (errVal) errVal.value = "Property 'system' must be a string";
    return false;
  }

  // Check replace if provided
  if (obj.replace !== undefined) {
    if (!Array.isArray(obj.replace)) {
      if (errVal) errVal.value = "Property 'replace' must be an array";
      return false;
    }

    for (let i = 0; i < obj.replace.length; i++) {
      if (!isReplace(obj.replace[i], errVal)) {
        if (errVal)
          errVal.value = `Invalid replace at index ${i}: ${errVal?.value}`;
        return false;
      }
    }
  }

  // Check tools if provided
  if (obj.tools !== undefined) {
    if (!Array.isArray(obj.tools)) {
      if (errVal) errVal.value = "Property 'tools' must be an array";
      return false;
    }

    for (const tool of obj.tools) {
      if (typeof tool !== "string") {
        if (errVal) errVal.value = "All tools must be strings";
        return false;
      }
    }
  }

  return true;
}

export function isWriteToDiskStep(
  obj: any,
  errVal?: ValidationError,
): obj is WriteToDiskStep {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.uses !== "write-to-disk") {
    if (errVal) errVal.value = "Uses must be 'write-to-disk'";
    return false;
  }

  if (typeof obj.output !== "string") {
    if (errVal) errVal.value = "Property 'output' must be a string";
    return false;
  }

  return true;
}

export function isReplace(obj: any, errVal?: ValidationError): obj is Replace {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (typeof obj.pattern !== "string") {
    if (errVal) errVal.value = "Property 'pattern' must be a string";
    return false;
  }

  if (obj.source !== "file") {
    if (errVal) errVal.value = "Property 'source' must be 'file'";
    return false;
  }

  if (typeof obj.files !== "string" && !Array.isArray(obj.files)) {
    if (errVal)
      errVal.value = "Property 'files' must be a string or an array of strings";
    return false;
  }

  if (Array.isArray(obj.files)) {
    for (let i = 0; i < obj.files.length; i++) {
      if (typeof obj.files[i] !== "string") {
        if (errVal) errVal.value = `Files entry at index ${i} must be a string`;
        return false;
      }
    }
  }

  return true;
}
