import YAML from "yaml";
import { ProgramOptions } from "../index.js";
import { loadFile } from "./file.js";
import { Display } from "./display.js";

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

export interface Job {
  type: "agent" | "batch";
  steps: Step[];
}

export interface SkipOptions {
  folder: string;
  contains: string;
}

export interface BatchJob extends Job {
  type: "batch";
  batch: {
    type: "files";
    input: string;
    "skip-condition"?: SkipOptions[];
  }[];
}

export interface Step {
  role: "system" | "user";
  content: string;
  response?: any;
  replace?: Replace[];
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
  if (!obj || typeof obj !== "object") {
    Display.debug.log("isJobConfig: obj is not an object");
    return false;
  }

  if (!isUsing(obj.using)) {
    Display.debug.log("isJobConfig: using property is invalid");
    return false;
  }

  if (typeof obj.jobs !== "object") {
    Display.debug.log("isJobConfig: jobs is not an object");
    return false;
  }

  for (const job of Object.values(obj.jobs)) {
    if (!isJob(job)) {
      Display.debug.log("isJobConfig: invalid job in jobs object");
      return false;
    }
  }

  return true;
}

export function isUsing(obj: any): obj is Using {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("isUsing: obj is not an object");
    return false;
  }

  if (obj.engine !== "openai" && obj.engine !== "anthropic") {
    Display.debug.log("isUsing: invalid engine");
    return false;
  }

  if (obj.model !== undefined && typeof obj.model !== "string") {
    Display.debug.log("isUsing: model is defined but not a string");
    return false;
  }

  return true;
}

export function isJob(obj: any): obj is Job {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("isJob: obj is not an object");
    return false;
  }

  if (obj.type !== "agent" && obj.type !== "batch") {
    Display.debug.log("isJob: invalid job type");
    return false;
  }

  if (!Array.isArray(obj.steps)) {
    Display.debug.log("isJob: steps is not an array");
    return false;
  }

  for (const step of obj.steps) {
    if (!isStep(step)) {
      Display.debug.log("isJob: invalid step in steps array");
      return false;
    }
  }

  return true;
}

export function isSkipOptions(obj: any): obj is SkipOptions {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("isSkipOptions: obj is not an object");
    return false;
  }

  if (typeof obj.folder !== "string") {
    Display.debug.log("isSkipOptions: folder is not a string");
    return false;
  }

  if (typeof obj.contains !== "string") {
    Display.debug.log("isSkipOptions: contains is not a string");
    return false;
  }

  return true;
}

export function isBatchJob(obj: any): obj is BatchJob {
  if (!isJob(obj)) {
    Display.debug.log("isBatchJob: obj is not a valid Job");
    return false;
  }

  obj = obj as BatchJob;

  if (obj.type !== "batch") {
    Display.debug.log("isBatchJob: job type is not 'batch'");
    return false;
  }

  if (!Array.isArray(obj.batch)) {
    Display.debug.log("isBatchJob: batch is not an array");
    return false;
  }

  for (const batchItem of obj.batch) {
    if (batchItem.type !== "files") {
      Display.debug.log("isBatchJob: batch item type is not 'files'");
      return false;
    }

    if (typeof batchItem.input !== "string") {
      Display.debug.log("isBatchJob: input is not a string");
      return false;
    }

    if (batchItem["skip-condition"] !== undefined) {
      if (!Array.isArray(batchItem["skip-condition"])) {
        Display.debug.log("isBatchJob: skip-condition is not an array");
        return false;
      }

      for (const skipCondition of batchItem["skip-condition"]) {
        if (!isSkipOptions(skipCondition)) {
          Display.debug.log("isBatchJob: invalid skip-condition");
          return false;
        }
      }
    }
  }

  return true;
}

export function isStep(obj: any): obj is Step {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("isStep: obj is not an object");
    return false;
  }

  if (obj.role !== "system" && obj.role !== "user") {
    Display.debug.log("isStep: invalid step type");
    return false;
  }

  if (typeof obj.content !== "string") {
    Display.debug.log("isStep: message is not a string");
    return false;
  }

  if (obj.response !== undefined && typeof obj.response !== "object") {
    Display.debug.log("isStep: response property is missing");
    return false;
  }

  if (obj.replace !== undefined && typeof obj.replace !== "object") {
    Display.debug.log("isStep: replace is defined but not an object");
    return false;
  }

  return true;
}

export function isReplace(obj: any): obj is Replace {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("isReplace: obj is not an object");
    return false;
  }

  if ("pattern" in obj && "source" in obj && "name" in obj) {
    return true;
  }

  Display.debug.log("isReplace: invalid replace object");
  return false;
}

export function isReplaceVariables(obj: any): obj is ReplaceVariables {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("isReplaceVariables: obj is not an object");
    return false;
  }

  if (typeof obj.pattern !== "string") {
    Display.debug.log("isReplaceVariables: pattern is not a string");
    return false;
  }

  if (obj.source !== undefined && obj.source !== "variables") {
    Display.debug.log("isReplaceVariables: source is not 'variables'");
    return false;
  }

  if (typeof obj.name !== "string") {
    Display.debug.log("isReplaceVariables: name is not a string");
    return false;
  }

  return true;
}

export function isReplaceFile(obj: any): obj is ReplaceFile {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("isReplaceFile: obj is not an object");
    return false;
  }

  if (typeof obj.pattern !== "string") {
    Display.debug.log("isReplaceFile: pattern is not a string");
    return false;
  }

  if (obj.source !== "file") {
    Display.debug.log("isReplaceFile: source is not 'file'");
    return false;
  }

  if (typeof obj.name !== "string") {
    Display.debug.log("isReplaceFile: name is not a string");
    return false;
  }

  return true;
}

export function isReplaceManyFiles(obj: any): obj is ReplaceManyFiles {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("isReplaceManyFiles: obj is not an object");
    return false;
  }

  if (typeof obj.pattern !== "string") {
    Display.debug.log("isReplaceManyFiles: pattern is not a string");
    return false;
  }

  if (obj.source !== "many-files") {
    Display.debug.log("isReplaceManyFiles: source is not 'many-files'");
    return false;
  }

  if (typeof obj.name !== "string" && !Array.isArray(obj.name)) {
    Display.debug.log(
      "isReplaceManyFiles: name is not a string or an array of strings",
    );
    return false;
  }

  return true;
}
