import { mkdirSync, readFileSync, writeFileSync } from "fs";
import YAML from "yaml";

// --- Configuration ---
const CONFIG_PATH = "./ax.config.yml";
const OUTPUT_DIR = "./output";
const OPENAI_OUTPUT_FILE = `${OUTPUT_DIR}/open-ai-models`;
const ANTHROPIC_OUTPUT_FILE = `${OUTPUT_DIR}/anthropic-models`;
const ANTHROPIC_API_VERSION = "2023-06-01";

// Ensure output directory exists
try {
  // Use { recursive: true } to prevent errors if the directory already exists
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (e) {
  // Handle potential errors during directory creation (e.g., permission issues)
  console.error(`Error creating output directory (${OUTPUT_DIR}):`, e.message);
  process.exit(1);
}

// --- Read Configuration ---
let config;
try {
  const configFile = readFileSync(CONFIG_PATH, "utf8");
  config = YAML.parse(configFile);
} catch (e) {
  console.error(
    `Error reading or parsing config file (${CONFIG_PATH}):`,
    e.message,
  );
  process.exit(1); // Exit if config fails
}

async function fetchOpenAIModels() {
  // --- Get API Key ---
  const apiKey = config?.openai?.["api-key"]; // Use optional chaining
  if (!apiKey) {
    console.error(
      `Error: OpenAI API key not found in ${CONFIG_PATH} under 'openai: api-key:'`,
    );
    return;
  }

  console.log("Fetching models from OpenAI API...");
  try {
    // --- Fetch Models from OpenAI ---
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    // --- Check Response Status ---
    if (!response.ok) {
      const errorBody = await response.text(); // Get more details on error
      throw new Error(
        `API request failed with status ${response.status} ${response.statusText}: ${errorBody}`,
      );
    }

    const data = await response.json();

    // --- Validate Response Data ---
    if (!data || !Array.isArray(data.data)) {
      throw new Error(
        "Invalid response format received from OpenAI API. Expected 'data' array.",
      );
    }

    // --- Process and Sort Models ---
    const modelNames = data.data
      .sort((a, b) => b.created - a.created)
      .map((model) => model.id);

    // --- Write to File ---
    writeFileSync(OPENAI_OUTPUT_FILE, modelNames.join("\n"));
    console.log(
      `Successfully fetched ${modelNames.length} OpenAI model names.`,
    );
    console.log(`OpenAI model names saved to ${OPENAI_OUTPUT_FILE}`);
  } catch (error) {
    console.error("Error fetching or processing OpenAI models:", error.message);
  }
}

async function fetchAnthropicModels() {
  // --- Get API Key ---
  const apiKey = config?.anthropic?.["api-key"]; // Use optional chaining
  if (!apiKey) {
    console.error(
      `Error: Anthropic API key not found in ${CONFIG_PATH} under 'anthropic: api-key:'`,
    );
    return;
  }

  console.log("Fetching models from Anthropic API...");
  try {
    // --- Fetch Models from Anthropic ---
    const response = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
        "Content-Type": "application/json",
      },
    });

    // --- Check Response Status ---
    if (!response.ok) {
      const errorBody = await response.text(); // Get more details on error
      throw new Error(
        `API request failed with status ${response.status} ${response.statusText}: ${errorBody}`,
      );
    }

    const data = await response.json();

    // --- Validate Response Data ---
    if (!data || !Array.isArray(data.data)) {
      throw new Error(
        "Invalid response format received from Anthropic API. Expected 'data' array.",
      );
    }

    // --- Process and Sort Models ---
    const modelNames = data.data
      .sort((a, b) => {
        // Handle cases where created_at might be missing or invalid
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA; // Sort newest first
      })
      .map((model) => model.id); // Extract model IDs

    // --- Write to File ---
    writeFileSync(ANTHROPIC_OUTPUT_FILE, modelNames.join("\n"));
    console.log(
      `Successfully fetched ${modelNames.length} Anthropic model names.`,
    );
    console.log(`Anthropic model names saved to ${ANTHROPIC_OUTPUT_FILE}`);
  } catch (error) {
    console.error(
      "Error fetching or processing Anthropic models:",
      error.message,
    );
  }
}

// Main function to fetch models from both providers
async function fetchAllModels() {
  try {
    await Promise.all([fetchOpenAIModels(), fetchAnthropicModels()]);
    console.log("Finished fetching models from all providers.");
  } catch (error) {
    console.error("Error during model fetching:", error.message);
    process.exit(1);
  }
}

// Run the main function
fetchAllModels();
