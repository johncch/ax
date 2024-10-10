import { BraveProvider } from "../utils/config.js";
import { Display } from "../utils/display.js";
import { delay } from "../utils/utils.js";
import { ToolSchema } from "./index.js";

export const schema: ToolSchema = {
  name: "brave",
  description: "Perform a search using the Brave search engine",
  parameters: {
    type: "object",
    properties: {
      searchTerm: {
        type: "string",
        description: "The search term to query",
      },
    },
    required: ["searchTerm"],
  },
};

export function getBraveSearch(config: BraveProvider) {
  if (config["api-key"]) {
    const key = config["api-key"];
    const delay = config.delay;
    return {
      name: "braveSearch",
      schema: schema,
      fn: createBraveSearch(key, delay),
    };
  }
  Display.debug.log("Brave search API key not found in config");
  return null;
}

function createBraveSearch(key: string, throttle: number = undefined) {
  let lastExecTime = 0;

  return async (params: { searchTerm: string }) => {
    const { searchTerm } = params;
    Display.debug.group(`Brave: searching for ${searchTerm}`);

    if (throttle) {
      while (Date.now() - lastExecTime < throttle) {
        await delay(throttle - (Date.now() - lastExecTime));
      }
      lastExecTime = Date.now();
    }

    try {
      const apiKey = key;
      const endpoint = "https://api.search.brave.com/res/v1/web/search";

      const url = new URL(endpoint);
      url.searchParams.append("q", searchTerm);
      url.searchParams.append("format", "json");

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching search results:", error);
      throw error;
    }
  };
}
