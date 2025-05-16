import { BraveProviderConfig } from "../cli/configs/types.js";
import { Recorder } from "../recorder/recorder.js";
import { delay } from "../utils/utils.js";
import { ToolExecutable, ToolSchema } from "./types.js";

const braveSearchToolSchema: ToolSchema = {
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

class BraveSearchTool implements ToolExecutable {
  name = "brave";
  schema: ToolSchema = braveSearchToolSchema;

  apiKey: string;
  throttle: number | undefined;
  lastExecTime: number = 0;

  constructor(config?: BraveProviderConfig) {
    if (config) {
      this.apiKey = config["api-key"];
      this.throttle = config.delay ?? undefined;
    }
  }

  setConfig(config: BraveProviderConfig) {
    this.apiKey = config["api-key"];
    this.throttle = config.delay ?? undefined;
  }

  async execute(
    params: { searchTerm: string },
    context: { recorder?: Recorder } = {},
  ) {
    const { searchTerm } = params;
    const { recorder } = context;
    recorder?.debug?.log({
      kind: "heading",
      message: `Brave: searching for ${searchTerm}`,
    });

    if (this.throttle) {
      while (Date.now() - this.lastExecTime < this.throttle) {
        await delay(this.throttle - (Date.now() - this.lastExecTime));
      }
      this.lastExecTime = Date.now();
    }

    try {
      const apiKey = this.apiKey;
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
  }
}

const braveSearchTool = new BraveSearchTool();
export default braveSearchTool;
