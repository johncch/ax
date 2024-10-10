import YAML from "yaml";
import { ProgramOptions } from "../index.js";
import { Display } from "./display.js";
import { loadFile } from "./file.js";

/* Defaults */
const DEFAULT_CONFIG_NAME = "ax.config";
const DEFAULT_CONFIG_FORMATS = ["yaml", "yml", "json"];

/* Types */
type Provider = {
  "api-key": string;
  model?: string;
};

export type ToolProvider = {
  "api-key": string;
};

export interface BraveProvider extends ToolProvider {
  delay?: number;
}

export type Config = {
  providers: { [providerName: string]: Provider };
  tools: {
    brave: BraveProvider;
    [tooName: string]: ToolProvider;
  };
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

export function isProvider(obj: any): obj is Provider {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("Provider: Not an object");
    return false;
  }

  if (!("api-key" in obj) || typeof obj["api-key"] !== "string") {
    Display.debug.log("Provider: Missing or invalid 'api-key'");
    return false;
  }

  if ("model" in obj && typeof obj.model !== "string") {
    Display.debug.log("Provider: Invalid 'model' type");
    return false;
  }

  return true;
}

export function isToolProvider(obj: any): obj is ToolProvider {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("ToolProvider: Not an object");
    return false;
  }

  if (!("api-key" in obj) || typeof obj["api-key"] !== "string") {
    Display.debug.log("ToolProvider: Missing or invalid 'api-key'");
    return false;
  }

  return true;
}

export function isBraveProvider(obj: any): obj is BraveProvider {
  if (!isToolProvider(obj)) {
    return false;
  }

  if ("delay" in obj && typeof obj.delay !== "number") {
    Display.debug.log("BraveProvider: Invalid 'delay' type");
    return false;
  }

  return true;
}

export function isConfig(obj: any): obj is Config {
  if (!obj || typeof obj !== "object") {
    Display.debug.log("Config: Not an object");
    return false;
  }

  if (!("providers" in obj) || typeof obj.providers !== "object") {
    Display.debug.log("Config: Missing or invalid 'providers' property");
    return false;
  }

  if (Object.keys(obj.providers).length === 0) {
    Display.debug.log("Config: 'providers' object is empty");
    return false;
  }

  if (!("tools" in obj) || typeof obj.tools !== "object") {
    Display.debug.log("Config: Missing or invalid 'tools' property");
    return false;
  }

  for (const [key, provider] of Object.entries(obj.providers)) {
    if (!isProvider(provider)) {
      Display.debug.log(`Config: Invalid provider for key '${key}'`);
      return false;
    }
  }

  for (const [key, tool] of Object.entries(obj.tools)) {
    if (key === "brave") {
      if (!isBraveProvider(tool)) {
        Display.debug.log(`Config: Invalid BraveProvider for key 'brave'`);
        return false;
      }
    } else {
      if (!isToolProvider(tool)) {
        Display.debug.log(`Config: Invalid ToolProvider for key '${key}'`);
        return false;
      }
    }
  }

  return true;
}
