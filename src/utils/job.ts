import YAML from "yaml";
import { ProgramOptions } from "../bin";
import { loadFile } from "./file";
import { log } from "./logger.js";

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
  [key: string]: any;
}

export interface Step {
  role: "system" | "user";
  content: string;
  response?: any;
  replace?: any;
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
  log.debug?.log(result);

  if (isJobConfig(result)) {
    return result as JobConfig;
  }
  throw new Error("The job file is not valid");
}

/* Helpers */
export function isJobConfig(obj: any): obj is JobConfig {
  if (!obj || typeof obj !== "object") {
    log.debug?.log("isJobConfig: obj is not an object");
    return false;
  }

  if (!isUsing(obj.using)) {
    log.debug?.log("isJobConfig: using property is invalid");
    return false;
  }

  if (typeof obj.jobs !== "object") {
    log.debug?.log("isJobConfig: jobs is not an object");
    return false;
  }

  for (const job of Object.values(obj.jobs)) {
    if (!isJob(job)) {
      log.debug?.log("isJobConfig: invalid job in jobs object");
      return false;
    }
  }

  return true;
}

export function isUsing(obj: any): obj is Using {
  if (!obj || typeof obj !== "object") {
    log.debug?.log("isUsing: obj is not an object");
    return false;
  }

  if (obj.engine !== "openai" && obj.engine !== "anthropic") {
    log.debug?.log("isUsing: invalid engine");
    return false;
  }

  if (obj.model !== undefined && typeof obj.model !== "string") {
    log.debug?.log("isUsing: model is defined but not a string");
    return false;
  }

  return true;
}

export function isJob(obj: any): obj is Job {
  if (!obj || typeof obj !== "object") {
    log.debug?.log("isJob: obj is not an object");
    return false;
  }

  if (obj.type !== "agent" && obj.type !== "batch") {
    log.debug?.log("isJob: invalid job type");
    return false;
  }

  if (!Array.isArray(obj.steps)) {
    log.debug?.log("isJob: steps is not an array");
    return false;
  }

  for (const step of obj.steps) {
    if (!isStep(step)) {
      log.debug?.log("isJob: invalid step in steps array");
      return false;
    }
  }

  return true;
}

export function isStep(obj: any): obj is Step {
  if (!obj || typeof obj !== "object") {
    log.debug?.log("isStep: obj is not an object");
    return false;
  }

  if (obj.role !== "system" && obj.role !== "user") {
    log.debug?.log("isStep: invalid step type");
    return false;
  }

  if (typeof obj.content !== "string") {
    log.debug?.log("isStep: message is not a string");
    return false;
  }

  if (obj.response !== undefined && typeof obj.response !== "object") {
    log.debug?.log("isStep: response property is missing");
    return false;
  }

  if (obj.replace !== undefined && typeof obj.replace !== "object") {
    log.debug?.log("isStep: replace is defined but not an object");
    return false;
  }

  return true;
}
