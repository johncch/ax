import YAML from "yaml";
import { ProgramOptions } from "../types.js";
import { Display } from "../utils/display.js";
import { loadFile } from "../utils/file.js";
import {
  AgentJob,
  AnthropicUse,
  BatchJob,
  ChatAction,
  Job,
  JobConfig,
  OllamaUse,
  OpenAIUse,
  Replace,
  ReplaceFile,
  ReplaceManyFiles,
  ReplaceVariables,
  SaveVarAction,
  SkipOptions,
  Step,
  ToolAction,
  ToolRespondAction,
  Using,
  ValidationError,
  WriteToDiskAction,
} from "./types.js";

/* Defaults */
const DEFAULT_JOB_NAME = "ax.job";
const DEFAULT_JOB_FORMATS = ["yaml", "yml", "json"];

/* Exports */

export async function getJobConfig(
  path: string | null,
  options: ProgramOptions,
): Promise<JobConfig> {
  const { content, format } = await loadFile(
    path,
    {
      name: DEFAULT_JOB_NAME,
      formats: DEFAULT_JOB_FORMATS,
    },
    "Job File",
  );

  let result: any = null;
  if (format === "json") {
    result = JSON.parse(content);
  } else if (format === "yaml" || format === "yml") {
    result = YAML.parse(content);
  } else {
    throw new Error("Invalid job file format");
  }
  Display.debug?.group("The Job Object");
  Display.debug?.log(result);

  const errVal = { value: "" };
  if (isJobConfig(result, errVal)) {
    return result as JobConfig;
  }
  throw new Error(`The job file is not valid: ${errVal.value}`);
}

/* Helpers */

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

  if (obj.type === "agent") {
    return isAgentJob(obj, errVal);
  } else if (obj.type === "batch") {
    return isBatchJob(obj, errVal);
  } else {
    if (errVal) errVal.value = "Job type must be 'agent' or 'batch'";
    return false;
  }
}

export function isAgentJob(
  obj: any,
  errVal?: ValidationError,
): obj is AgentJob {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.type !== "agent") {
    if (errVal) errVal.value = "Job type must be 'agent'";
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

  // Check variables if provided
  if (obj.variables !== undefined) {
    if (typeof obj.variables !== "object" || Array.isArray(obj.variables)) {
      if (errVal) errVal.value = "Property 'variables' must be an object";
      return false;
    }

    for (const [key, value] of Object.entries(obj.variables)) {
      if (typeof value !== "string") {
        if (errVal) errVal.value = `Variable '${key}' must be a string`;
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

  // Check variables if provided
  if (obj.variables !== undefined) {
    if (typeof obj.variables !== "object" || Array.isArray(obj.variables)) {
      if (errVal) errVal.value = "Property 'variables' must be an object";
      return false;
    }

    for (const [key, value] of Object.entries(obj.variables)) {
      if (typeof value !== "string") {
        if (errVal) errVal.value = `Variable '${key}' must be a string`;
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

    if (typeof batchItem.input !== "string") {
      if (errVal)
        errVal.value = `Batch item at index ${i} must have a string 'input' property`;
      return false;
    }

    // Check skip-condition if provided
    if (batchItem["skip-condition"] !== undefined) {
      if (!Array.isArray(batchItem["skip-condition"])) {
        if (errVal)
          errVal.value = `Batch item at index ${i} must have an array 'skip-condition' property`;
        return false;
      }

      for (let j = 0; j < batchItem["skip-condition"].length; j++) {
        if (!isSkipOptions(batchItem["skip-condition"][j], errVal)) {
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

  if (typeof obj.folder !== "string") {
    if (errVal) errVal.value = "Property 'folder' must be a string";
    return false;
  }

  if (typeof obj.contains !== "string") {
    if (errVal) errVal.value = "Property 'contains' must be a string";
    return false;
  }

  return true;
}

export function isStep(obj: any, errVal?: ValidationError): obj is Step {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (!obj.action || typeof obj.action !== "string") {
    if (errVal) errVal.value = "Step must have a string 'action' property";
    return false;
  }

  if (obj.action === "chat") {
    return isChatAction(obj, errVal);
  } else if (obj.action === "tool-call") {
    return isToolAction(obj, errVal);
  } else if (obj.action === "tool-respond") {
    return isToolRespondAction(obj, errVal);
  } else if (obj.action === "write-to-disk") {
    return isWriteToDiskAction(obj, errVal);
  } else if (obj.action === "save-to-variables") {
    return isSaveVarAction(obj, errVal);
  } else {
    if (errVal) errVal.value = `Unknown action type: ${obj.action}`;
    return false;
  }
}

export function isChatAction(
  obj: any,
  errVal?: ValidationError,
): obj is ChatAction {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.action !== "chat") {
    if (errVal) errVal.value = "Action must be 'chat'";
    return false;
  }

  if (typeof obj.content !== "string") {
    if (errVal) errVal.value = "Property 'content' must be a string";
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

  return true;
}

export function isToolAction(
  obj: any,
  errVal?: ValidationError,
): obj is ToolAction {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.action !== "tool-call") {
    if (errVal) errVal.value = "Action must be 'tool-call'";
    return false;
  }

  if (!Array.isArray(obj.toolCalls)) {
    if (errVal) errVal.value = "Property 'toolCalls' must be an array";
    return false;
  }

  // Note: We're not checking the structure of ToolCall as it's imported from another file

  // Check throttle if provided
  if (obj.throttle !== undefined && typeof obj.throttle !== "number") {
    if (errVal) errVal.value = "Property 'throttle' must be a number";
    return false;
  }

  return true;
}

export function isToolRespondAction(
  obj: any,
  errVal?: ValidationError,
): obj is ToolRespondAction {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.action !== "tool-respond") {
    if (errVal) errVal.value = "Action must be 'tool-respond'";
    return false;
  }

  if (!Array.isArray(obj.toolCalls)) {
    if (errVal) errVal.value = "Property 'toolCalls' must be an array";
    return false;
  }

  // Note: We're not checking the structure of ToolCall as it's imported from another file

  return true;
}

export function isWriteToDiskAction(
  obj: any,
  errVal?: ValidationError,
): obj is WriteToDiskAction {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.action !== "write-to-disk") {
    if (errVal) errVal.value = "Action must be 'write-to-disk'";
    return false;
  }

  if (typeof obj.output !== "string") {
    if (errVal) errVal.value = "Property 'output' must be a string";
    return false;
  }

  return true;
}

export function isSaveVarAction(
  obj: any,
  errVal?: ValidationError,
): obj is SaveVarAction {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (obj.action !== "save-to-variables") {
    if (errVal) errVal.value = "Action must be 'save-to-variables'";
    return false;
  }

  if (typeof obj.name !== "string") {
    if (errVal) errVal.value = "Property 'name' must be a string";
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

  if (obj.source === "variables") {
    return isReplaceVariables(obj as ReplaceVariables, errVal);
  } else if (obj.source === "file") {
    return isReplaceFile(obj as ReplaceFile, errVal);
  } else if (obj.source === "many-files") {
    return isReplaceManyFiles(obj as ReplaceManyFiles, errVal);
  } else if (obj.source === undefined) {
    // For ReplaceVariables, source is optional and defaults to "variables"
    return isReplaceVariables(obj as ReplaceVariables, errVal);
  } else {
    if (errVal)
      errVal.value =
        "Property 'source' must be 'variables', 'file', or 'many-files'";
    return false;
  }
}

export function isReplaceVariables(
  obj: any,
  errVal?: ValidationError,
): obj is ReplaceVariables {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (typeof obj.pattern !== "string") {
    if (errVal) errVal.value = "Property 'pattern' must be a string";
    return false;
  }

  if (obj.source !== undefined && obj.source !== "variables") {
    if (errVal)
      errVal.value = "Property 'source' must be 'variables' or undefined";
    return false;
  }

  if (typeof obj.name !== "string") {
    if (errVal) errVal.value = "Property 'name' must be a string";
    return false;
  }

  return true;
}

export function isReplaceFile(
  obj: any,
  errVal?: ValidationError,
): obj is ReplaceFile {
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

  if (typeof obj.name !== "string") {
    if (errVal) errVal.value = "Property 'name' must be a string";
    return false;
  }

  return true;
}

export function isReplaceManyFiles(
  obj: any,
  errVal?: ValidationError,
): obj is ReplaceManyFiles {
  if (!obj || typeof obj !== "object") {
    if (errVal) errVal.value = "Not an object";
    return false;
  }

  if (typeof obj.pattern !== "string") {
    if (errVal) errVal.value = "Property 'pattern' must be a string";
    return false;
  }

  if (obj.source !== "many-files") {
    if (errVal) errVal.value = "Property 'source' must be 'many-files'";
    return false;
  }

  if (typeof obj.name !== "string" && !Array.isArray(obj.name)) {
    if (errVal)
      errVal.value = "Property 'name' must be a string or an array of strings";
    return false;
  }

  if (Array.isArray(obj.name)) {
    for (let i = 0; i < obj.name.length; i++) {
      if (typeof obj.name[i] !== "string") {
        if (errVal) errVal.value = `Name at index ${i} must be a string`;
        return false;
      }
    }
  }

  return true;
}
