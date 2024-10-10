import YAML from "yaml";
import { ProgramOptions } from "../index.js";
import { ToolCall } from "../providers/types.js";
import { Display } from "./display.js";
import { loadFile } from "./file.js";

/* Defaults */
const DEFAULT_JOB_NAME = "ax.job";
const DEFAULT_JOB_FORMATS = ["yaml", "yml", "json"];

/* Types */
export interface JobConfig {
  using: Using;
  jobs: Record<string, Job>;
}

export interface Using {
  engine: "openai" | "anthropic";
  model?: string;
}

export type Job = AgentJob | BatchJob;

export interface AgentJob {
  type: "agent";
  tools?: string[];
  variables?: Record<string, string>;
  steps: Step[];
}

export interface SkipOptions {
  folder: string;
  contains: string;
}

export interface BatchJob {
  type: "batch";
  tools?: string[];
  variables?: Record<string, string>;
  batch: {
    type: "files";
    input: string;
    "skip-condition"?: SkipOptions[];
  }[];
  steps: Step[];
}

export type Step =
  | ChatAction
  | ToolAction
  | ToolRespondAction
  | WriteToDiskAction
  | SaveVarAction;

export interface ChatAction {
  action: "chat";
  system?: string;
  content: string;
  replace?: Replace[];
}

export interface ToolAction {
  action: "tool-call";
  toolCalls: ToolCall[];
  throttle?: number;
}

export interface ToolRespondAction {
  action: "tool-respond";
  toolCalls: ToolCall[];
}

export interface WriteToDiskAction {
  action: "write-to-disk";
  output: string;
}

export interface SaveVarAction {
  action: "save-to-variables";
  name: string;
}

export type Replace = ReplaceManyFiles | ReplaceFile | ReplaceVariables;

export interface ReplaceVariables {
  pattern: string;
  source?: "variables";
  name: string;
}

export interface ReplaceFile {
  pattern: string;
  source: "file";
  name: string;
}

export interface ReplaceManyFiles {
  pattern: string;
  source: "many-files";
  name: string | string[];
}

/* Exports */

export async function getJob(
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

  if (isJobConfig(result)) {
    return result as JobConfig;
  }
  throw new Error("The job file is not valid");
}

/* Helpers */

export function isJobConfig(obj: any): obj is JobConfig {
  Display.debug.log("Checking if object is JobConfig");
  if (typeof obj !== "object") {
    Display.debug.log("JobConfig: Not an object");
    return false;
  }
  if (!isUsing(obj.using)) {
    Display.debug.log("JobConfig: Invalid 'using' property");
    return false;
  }
  if (typeof obj.jobs !== "object") {
    Display.debug.log("JobConfig: 'jobs' property is not an object");
    return false;
  }
  for (const key in obj.jobs) {
    if (!isJob(obj.jobs[key])) {
      Display.debug.log(`JobConfig: Invalid job at key '${key}'`);
      return false;
    }
  }
  return true;
}

export function isUsing(obj: any): obj is Using {
  Display.debug.log("Checking if object is Using");
  if (typeof obj !== "object") {
    Display.debug.log("Using: Not an object");
    return false;
  }
  if (
    typeof obj.engine !== "string" ||
    (obj.engine !== "openai" && obj.engine !== "anthropic")
  ) {
    Display.debug.log("Using: Invalid 'engine' property");
    return false;
  }
  if (obj.model !== undefined && typeof obj.model !== "string") {
    Display.debug.log("Using: Invalid 'model' property");
    return false;
  }
  return true;
}

export function isJob(obj: any): obj is Job {
  Display.debug.log("Checking if object is Job");
  if (typeof obj !== "object") {
    Display.debug.log("Job: Not an object");
    return false;
  }
  if (isAgentJob(obj)) {
    return true;
  } else if (isBatchJob(obj)) {
    return true;
  } else {
    Display.debug.log("Job: Neither AgentJob nor BatchJob");
    return false;
  }
}

export function isAgentJob(obj: any): obj is AgentJob {
  Display.debug.log("Checking if object is AgentJob");
  if (typeof obj !== "object") {
    Display.debug.log("AgentJob: Not an object");
    return false;
  }
  if (obj.type !== "agent") {
    Display.debug.log("AgentJob: Invalid 'type' property");
    return false;
  }
  if (!Array.isArray(obj.steps)) {
    Display.debug.log("AgentJob: 'steps' is not an array");
    return false;
  }
  for (const step of obj.steps) {
    if (!isStep(step)) {
      Display.debug.log("AgentJob: Invalid step in 'steps' array");
      return false;
    }
  }
  return true;
}

export function isSkipOptions(obj: any): obj is SkipOptions {
  Display.debug.log("Checking if object is SkipOptions");
  if (typeof obj !== "object") {
    Display.debug.log("SkipOptions: Not an object");
    return false;
  }
  if (typeof obj.folder !== "string") {
    Display.debug.log("SkipOptions: Invalid 'folder' property");
    return false;
  }
  if (typeof obj.contains !== "string") {
    Display.debug.log("SkipOptions: Invalid 'contains' property");
    return false;
  }
  return true;
}

export function isBatchJob(obj: any): obj is BatchJob {
  Display.debug.log("Checking if object is BatchJob");
  if (typeof obj !== "object") {
    Display.debug.log("BatchJob: Not an object");
    return false;
  }
  if (obj.type !== "batch") {
    Display.debug.log("BatchJob: Invalid 'type' property");
    return false;
  }
  if (!Array.isArray(obj.batch)) {
    Display.debug.log("BatchJob: 'batch' is not an array");
    return false;
  }
  for (const item of obj.batch) {
    if (typeof item !== "object") {
      Display.debug.log("BatchJob: Invalid batch item");
      return false;
    }
    if (item.type !== "files") {
      Display.debug.log("BatchJob: Invalid batch item type");
      return false;
    }
    if (typeof item.input !== "string") {
      Display.debug.log("BatchJob: Invalid 'input' property in batch item");
      return false;
    }
    if (item["skip-condition"] !== undefined) {
      if (!Array.isArray(item["skip-condition"])) {
        Display.debug.log("BatchJob: 'skip-condition' is not an array");
        return false;
      }
      for (const skipOption of item["skip-condition"]) {
        if (!isSkipOptions(skipOption)) {
          Display.debug.log(
            "BatchJob: Invalid skip option in 'skip-condition'",
          );
          return false;
        }
      }
    }
  }
  if (!Array.isArray(obj.steps)) {
    Display.debug.log("BatchJob: 'steps' is not an array");
    return false;
  }
  for (const step of obj.steps) {
    if (!isStep(step)) {
      Display.debug.log("BatchJob: Invalid step in 'steps' array");
      return false;
    }
  }
  return true;
}

export function isStep(obj: any): obj is Step {
  Display.debug.log("Checking if object is Step");
  if (typeof obj !== "object") {
    Display.debug.log("Step: Not an object");
    return false;
  }
  if (isChatAction(obj)) {
    return true;
  } else if (isToolAction(obj)) {
    return true;
  } else if (isToolRespondAction(obj)) {
    return true;
  } else if (isWriteToDiskAction(obj)) {
    return true;
  } else if (isSaveVarAction(obj)) {
    return true;
  } else {
    Display.debug.log("Step: Not a valid Step type");
    return false;
  }
}

export function isChatAction(obj: any): obj is ChatAction {
  Display.debug.log("Checking if object is ChatAction");
  if (typeof obj !== "object") {
    Display.debug.log("ChatAction: Not an object");
    return false;
  }
  if (obj.action !== "chat") {
    Display.debug.log("ChatAction: Invalid 'action' property");
    return false;
  }
  if (obj.system !== undefined && typeof obj.system !== "string") {
    Display.debug.log("ChatAction: Invalid 'system' property");
    return false;
  }
  if (typeof obj.content !== "string") {
    Display.debug.log("ChatAction: Invalid 'content' property");
    return false;
  }
  if (obj.replace !== undefined) {
    if (!Array.isArray(obj.replace)) {
      Display.debug.log("ChatAction: 'replace' is not an array");
      return false;
    }
    for (const replace of obj.replace) {
      if (!isReplace(replace)) {
        Display.debug.log("ChatAction: Invalid replace in 'replace' array");
        return false;
      }
    }
  }
  return true;
}

export function isToolAction(obj: any): obj is ToolAction {
  Display.debug.log("Checking if object is ToolAction");
  if (typeof obj !== "object") {
    Display.debug.log("ToolAction: Not an object");
    return false;
  }
  if (obj.action !== "tool-call") {
    Display.debug.log("ToolAction: Invalid 'action' property");
    return false;
  }
  if (!Array.isArray(obj.toolCalls)) {
    Display.debug.log("ToolAction: 'toolCalls' is not an array");
    return false;
  }
  return true;
}

export function isToolRespondAction(obj: any): obj is ToolRespondAction {
  Display.debug.log("Checking if object is ToolRespondAction");
  if (typeof obj !== "object") {
    Display.debug.log("ToolRespondAction: Not an object");
    return false;
  }
  if (obj.action !== "tool-respond") {
    Display.debug.log("ToolRespondAction: Invalid 'action' property");
    return false;
  }
  if (!Array.isArray(obj.toolCalls)) {
    Display.debug.log("ToolRespondAction: 'toolCalls' is not an array");
    return false;
  }
  return true;
}

export function isWriteToDiskAction(obj: any): obj is WriteToDiskAction {
  Display.debug.log("Checking if object is WriteToDiskAction");
  if (typeof obj !== "object") {
    Display.debug.log("WriteToDiskAction: Not an object");
    return false;
  }
  if (obj.action !== "write-to-disk") {
    Display.debug.log("WriteToDiskAction: Invalid 'action' property");
    return false;
  }
  if (typeof obj.output !== "string") {
    Display.debug.log("WriteToDiskAction: Invalid 'output' property");
    return false;
  }
  return true;
}

export function isSaveVarAction(obj: any): obj is SaveVarAction {
  Display.debug.log("Checking if object is SaveVarAction");
  if (typeof obj !== "object") {
    Display.debug.log("SaveVarAction: Not an object");
    return false;
  }
  if (obj.action !== "save-to-variables") {
    Display.debug.log("SaveVarAction: Invalid 'action' property");
    return false;
  }
  if (typeof obj.name !== "string") {
    Display.debug.log("SaveVarAction: Invalid 'name' property");
    return false;
  }
  return true;
}

export function isReplace(obj: any): obj is Replace {
  Display.debug.log("Checking if object is Replace");
  if (typeof obj !== "object") {
    Display.debug.log("Replace: Not an object");
    return false;
  }
  if (isReplaceManyFiles(obj)) {
    return true;
  } else if (isReplaceFile(obj)) {
    return true;
  } else if (isReplaceVariables(obj)) {
    return true;
  } else {
    Display.debug.log("Replace: Not a valid Replace type");
    return false;
  }
}

export function isReplaceVariables(obj: any): obj is ReplaceVariables {
  Display.debug.log("Checking if object is ReplaceVariables");
  if (typeof obj !== "object") {
    Display.debug.log("ReplaceVariables: Not an object");
    return false;
  }
  if (typeof obj.pattern !== "string") {
    Display.debug.log("ReplaceVariables: Invalid 'pattern' property");
    return false;
  }
  if (obj.source !== undefined && obj.source !== "variables") {
    Display.debug.log("ReplaceVariables: Invalid 'source' property");
    return false;
  }
  if (typeof obj.name !== "string") {
    Display.debug.log("ReplaceVariables: Invalid 'name' property");
    return false;
  }
  return true;
}

export function isReplaceFile(obj: any): obj is ReplaceFile {
  Display.debug.log("Checking if object is ReplaceFile");
  if (typeof obj !== "object") {
    Display.debug.log("ReplaceFile: Not an object");
    return false;
  }
  if (typeof obj.pattern !== "string") {
    Display.debug.log("ReplaceFile: Invalid 'pattern' property");
    return false;
  }
  if (obj.source !== "file") {
    Display.debug.log("ReplaceFile: Invalid 'source' property");
    return false;
  }
  if (typeof obj.name !== "string") {
    Display.debug.log("ReplaceFile: Invalid 'name' property");
    return false;
  }
  return true;
}

export function isReplaceManyFiles(obj: any): obj is ReplaceManyFiles {
  Display.debug.log("Checking if object is ReplaceManyFiles");
  if (typeof obj !== "object") {
    Display.debug.log("ReplaceManyFiles: Not an object");
    return false;
  }
  if (typeof obj.pattern !== "string") {
    Display.debug.log("ReplaceManyFiles: Invalid 'pattern' property");
    return false;
  }
  if (obj.source !== "many-files") {
    Display.debug.log("ReplaceManyFiles: Invalid 'source' property");
    return false;
  }
  if (typeof obj.name !== "string" && !Array.isArray(obj.name)) {
    Display.debug.log("ReplaceManyFiles: Invalid 'name' property");
    return false;
  }
  return true;
}
