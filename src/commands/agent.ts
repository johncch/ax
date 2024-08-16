import { ProgramOptions } from "../index.js";
import { readFile } from "node:fs/promises";
import { AIProvider, AIResponse, ChatItem } from "../engines";
import { replaceFilePattern, writeFileWithDirectories } from "../utils/file";
import { arrayify } from "../utils/iteration";
import { Job, Step } from "../utils/job";
import { log } from "../utils/logger";
import { Stats } from "../utils/stats";

export async function getAgentCommand(
  job: Job,
  provider: AIProvider,
  variables: Record<string, string> = {},
) {
  const agentJob = new AgentJob(job, provider, variables);
  return agentJob;
}

export class AgentJob {
  type = "agent";
  job: Job;
  provider: AIProvider;
  variables: Record<string, string>;

  constructor(
    job: Job,
    provider: AIProvider,
    variables: Record<string, string> = {},
  ) {
    this.job = job;
    this.provider = provider;
    this.variables = variables;
  }

  async execute(options: ProgramOptions, stats: Stats) {
    const { job, provider } = this;
    const { steps } = job;

    const messages: ChatItem[] = [];
    for (const [index, step] of steps.entries()) {
      log?.info.log(`Processing step ${index}: ${step.role}`);
      if (step.role === "system") {
        messages.push({
          role: step.role,
          content: step.content,
        });
      } else if (step.role === "user") {
        // Input handling
        const content = await this.processInput(step);
        messages.push({
          role: step.role,
          content,
        });

        // Execute
        if (options.dryRun) {
          log.info.log("Dry run mode enabled. Skipping API call.");
          continue;
        }
        const request = provider.createChatCompletionRequest(messages);
        const response = await request.execute();

        // parse response and get decision
        stats.in += response.usage.in;
        stats.out += response.usage.out;
        const outcomes = await this.handleResponse(step, response);
        const { action, message, error } = outcomes;
        if (action == "error") {
          console.error(error);
          break;
        }
        if (action == "continue") {
          if (message) {
            messages.push(message);
          }
        }
        if (action == "tool-use") {
          // TODO
        }
      }
    }
  }

  async processInput(step: Step): Promise<string> {
    let content = step.content;
    if (step.replace) {
      const replacements = arrayify(step.replace);
      for (const r of replacements) {
        const source = r.source ?? "variables";
        if (source === "variables") {
          content = content.replace(r.pattern, this.variables[r.name]);
        } else if (source === "file") {
          try {
            const replacement = await readFile(r.name, "utf-8");
            content = content.replace(r.pattern, replacement);
          } catch (error) {
            console.error(error);
          }
        }
      }
    }
    return content;
  }

  async handleResponse(
    step: Step,
    response: AIResponse,
  ): Promise<{ action: string; message?: ChatItem; error?: Error }> {
    if (response.type == "success") {
      switch (response.reason) {
        case "stop": {
          await this.processResponse(step, response.message.content ?? "");
          return {
            action: "continue",
            message: response.message,
          };
        }
        case "length": {
          return {
            action: "error",
            message: response.message,
            error: new Error(
              "Incomplete model output due to `max_tokens` parameter or token limit",
            ),
          };
        }
        case "function_call": {
          // TODO
        }
        default: {
          return {
            action: "error",
            message: response.message,
            error: new Error(
              "Incomplete model output due to `max_tokens` parameter or token limit",
            ),
          };
        }
      }
    }
    return {
      action: "error",
      error: new Error("Failed to get response from AI provider"),
    };
  }

  async processResponse(step: Step, content: string) {
    const responses = arrayify(step.response ?? []);
    for (const response of responses) {
      if (response.action === "write-to-disk") {
        const output = response.output;
        const filepath = replaceFilePattern(output, this.variables.file);
        await writeFileWithDirectories(filepath, content);
      } else if (response.action === "save-to-variables") {
        this.variables[response.output] = content;
      } else {
        log.debug?.log("No post action to take");
      }
    }
  }
}
