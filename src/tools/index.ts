import { ProgramOptions } from "../index.js";
import { Config } from "../utils/config.js";
import { getBraveSearch } from "./brave.js";

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, object>;
    required: string[];
  };
}

type ToolFn = (...args: any[]) => Promise<any>;

export interface ToolManager {
  tools: Record<string, ToolFn>;
  schemas: Record<string, object>;
  getSchemas: (names: string[]) => ToolSchema[];
}

export function getTools(config: Config, options: ProgramOptions): ToolManager {
  const tools: Record<string, ToolFn> = {};
  const schemas: Record<string, ToolSchema> = {};
  // Brave Search
  const braveSearch = getBraveSearch(config.tools.brave);
  if (braveSearch) {
    tools.brave = braveSearch.fn;
    schemas.brave = braveSearch.schema;
  }

  const getSchemas = (names: string[]) => {
    const result: ToolSchema[] = [];
    for (const name of names) {
      if (schemas[name]) {
        result.push(schemas[name]);
      }
    }
    return result;
  };

  return {
    tools,
    schemas,
    getSchemas,
  };
}
