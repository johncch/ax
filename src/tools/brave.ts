import { BraveProviderConfig } from "../configs/types.js";
import { Recorder } from "../recorder/recorder.js";
import { delay } from "../utils/utils.js";
import { ToolSchema } from "./types.js";

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

export function getBraveSearch(
  config: BraveProviderConfig | null = null,
  recorder?: Recorder,
) {
  if (config && config["api-key"]) {
    const key = config["api-key"];
    const delay = config.delay;
    return {
      name: "braveSearch",
      schema: schema,
      fn: createBraveSearch(key, delay, recorder),
    };
  }
  recorder?.debug?.log("Brave search API key not found in config");
  return null;
}

function createBraveSearch(
  key: string,
  throttle: number = undefined,
  recorder?: Recorder,
) {
  let lastExecTime = 0;

  return async (params: { searchTerm: string }) => {
    const { searchTerm } = params;
    recorder.debug?.log({
      kind: "heading",
      message: `Brave: searching for ${searchTerm}`,
    });

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
