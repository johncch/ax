import YAML from "yaml";
import { Recorder } from "../../recorder/recorder.js";
import { loadFile } from "../../utils/file.js";
import { isJobConfig } from "./job.js";
import { isServiceConfig } from "./service.js";
import { JobConfig, ServiceConfig } from "./types.js";

const DEFAULT_JOB_NAME = "ax.job";
const DEFAULT_JOB_FORMATS = ["yaml", "yml", "json"];

export async function getJobConfig(
  path: string | null,
  context: {
    recorder?: Recorder;
  },
): Promise<JobConfig> {
  const { recorder } = context;
  const { content, format } = await loadFile({
    path,
    defaults: {
      name: DEFAULT_JOB_NAME,
      formats: DEFAULT_JOB_FORMATS,
    },
    loader: "Job File",
  });

  let result: any = null;
  if (format === "json") {
    result = JSON.parse(content);
  } else if (format === "yaml" || format === "yml") {
    result = YAML.parse(content);
  } else {
    throw new Error("Invalid job file format");
  }
  recorder?.debug?.heading.log("The Job Object");
  recorder?.debug?.log(result);

  const errVal = { value: "" };
  if (isJobConfig(result, errVal)) {
    return result as JobConfig;
  }
  throw new Error(`The job file is not valid: ${errVal.value}`);
}

const DEFAULT_CONFIG_NAME = "ax.config";
const DEFAULT_CONFIG_FORMATS = ["yaml", "yml", "json"];

export async function getServiceConfig(
  configPath: string | null,
  context: {
    recorder?: Recorder;
  },
): Promise<ServiceConfig> {
  const { recorder } = context;
  const { content, format } = await loadFile({
    path: configPath,
    defaults: {
      name: DEFAULT_CONFIG_NAME,
      formats: DEFAULT_CONFIG_FORMATS,
    },
    loader: "Config File",
  });

  let result: any = null;
  if (format === "json") {
    result = JSON.parse(content);
  } else if (format === "yaml" || format === "yml") {
    result = YAML.parse(content);
  } else {
    throw new Error("Invalid config file format");
  }
  recorder?.debug?.heading.log("The Config Object");
  recorder?.debug?.log(result);

  const valError = { value: "" };
  if (isServiceConfig(result, valError)) {
    return result;
  }

  throw new Error(valError.value);
}
