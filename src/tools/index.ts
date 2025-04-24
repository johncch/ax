import { ProviderConfig } from "../configs/types.js";
import { ProgramOptions } from "../types.js";
import { getBraveSearch } from "./brave.js";
import { ToolFn, ToolManager, ToolSchema } from "./types.js";

export function getTools(
  config: ProviderConfig,
  options?: ProgramOptions,
): ToolManager {
  const tools: Record<string, ToolFn> = {};
  const schemas: Record<string, ToolSchema> = {};
  // Brave Search
  const braveSearch = getBraveSearch(config.brave);
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
