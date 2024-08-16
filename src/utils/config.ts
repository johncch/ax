import YAML from "yaml";
import { ProgramOptions } from "../index.js";
import { loadFile } from "./file.js";
import { Display } from "./display.js";

/* Defaults */
const DEFAULT_CONFIG_NAME = "ax.config";
const DEFAULT_CONFIG_FORMATS = ["yaml", "yml", "json"];

/* Types */
type Provider = {
  "api-key": string;
  model?: string;
};

export type Config = {
  providers: { [key: string]: Provider } & { [K in string]: Provider };
};

/* Exports */
export async function getConfig(
  configPath: string | null,
  options: ProgramOptions,
): Promise<Config> {
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

  if (isConfig(result)) {
    return result as Config;
  }
  throw new Error("The config file is not valid");
}

/* Helpers */

function isConfig(obj: any): obj is Config {
  return (
    obj &&
    typeof obj === "object" &&
    "providers" in obj &&
    typeof obj.providers === "object" &&
    Object.keys(obj.providers).length > 0 &&
    Object.entries(obj.providers).every(
      ([key, provider]) =>
        typeof key === "string" &&
        provider &&
        typeof provider === "object" &&
        "api-key" in provider &&
        typeof provider["api-key"] === "string" &&
        (!("model" in provider) || typeof provider.model === "string"),
    )
  );
}
