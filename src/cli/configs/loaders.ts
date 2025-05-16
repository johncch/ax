import YAML from "yaml";
import { Recorder } from "../../recorder/recorder.js";
import { ProgramOptions } from "../../types.js";
import { loadFile } from "../../utils/file.js";
import { isJobConfig } from "./job.js";
import { isProviderConfig } from "./service.js";
import { JobConfig, ProviderConfig } from "./types.js";

const DEFAULT_JOB_NAME = "ax.job";
const DEFAULT_JOB_FORMATS = ["yaml", "yml", "json"];

export async function getJobConfig({
  path,
  options,
  recorder,
}: {
  path: string | null;
  options: ProgramOptions;
  recorder?: Recorder;
}): Promise<JobConfig> {
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
  recorder?.debug?.log({ kind: "heading", message: "The Job Object" });
  recorder?.debug?.log(result);

  const errVal = { value: "" };
  if (isJobConfig(result, errVal)) {
    return result as JobConfig;
  }
  throw new Error(`The job file is not valid: ${errVal.value}`);
}

const DEFAULT_CONFIG_NAME = "ax.config";
const DEFAULT_CONFIG_FORMATS = ["yaml", "yml", "json"];

export async function getProviderConfig({
  configPath,
  options,
  recorder,
}: {
  configPath: string | null;
  options: ProgramOptions;
  recorder?: Recorder;
}): Promise<ProviderConfig> {
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
  recorder?.debug?.log({ kind: "heading", message: "The Config Object" });
  recorder?.debug?.log(result);

  const valError = { value: "" };
  if (isProviderConfig(result, valError)) {
    return result;
  }

  throw new Error(valError.value);
}
