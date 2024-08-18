import { type UUID, randomUUID } from "node:crypto";
import {
  AIProvider,
  AIProviderStopReason,
  AIResponse,
  Chat,
  ChatItem,
} from "../providers/types.js";
import { ProgramOptions } from "../index.js";
import { Display } from "../utils/display.js";
import {
  FilePathInfo,
  replaceFilePattern,
  writeFileWithDirectories,
} from "../utils/file.js";
import { Job, Step } from "../utils/job.js";
import { fileReplacer, manyFilesReplacer } from "../utils/replace.js";
import { Stats } from "../utils/stats.js";
import { arrayify, friendly } from "../utils/utils.js";

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
  id: UUID;
  job: Job;
  provider: AIProvider;
  variables: Record<string, any>;

  constructor(
    job: Job,
    provider: AIProvider,
    variables: Record<string, string> = {},
  ) {
    this.id = randomUUID();
    this.job = job;
    this.provider = provider;
    this.variables = variables;
  }

  async execute(options: ProgramOptions, stats: Stats) {
    const { job, provider } = this;
    const { steps } = job;

    Display.progress.add(this.id, `[${friendly(this.id)}] Starting job`);
    const chat = new Chat();
    let providerError: Error | undefined;
    for (const [index, step] of steps.entries()) {
      Display.progress.update(
        this.id,
        `[${friendly(this.id)}] Processing step ${index + 1}: ${step.role}`,
      );
      if (step.role === "system") {
        chat.addSystem(step.content);
      } else if (step.role === "user") {
        // Input handling
        const content = await this.processInput(step);
        chat.addUser(content);

        // Execute
        if (options.dryRun) {
          Display.debug.log(chat);
          continue;
        }
        const request = provider.createChatCompletionRequest(chat);
        const response = await request.execute();

        // parse response and get decision
        stats.in += response.usage.in;
        stats.out += response.usage.out;
        const outcomes = await this.handleResponse(step, response);
        const { action, message, error } = outcomes;
        if (action == "error") {
          providerError = error;
          break;
        }
        if (action == "continue") {
          if (message) {
            chat.addAssistant(message.content);
          }
        }
        if (action == "tool-use") {
          // TODO
        }
      }
    }
    if (providerError) {
      Display.progress.fail(this.id, `[${friendly(this.id)}] Failed`);
      console.error(providerError);
    } else {
      Display.progress.succeed(this.id, `[${friendly(this.id)}] complete`);
    }
  }

  async processInput(step: Step): Promise<string> {
    let content = step.content;
    if (step.replace) {
      const replacements = arrayify(step.replace);
      for (const r of replacements) {
        switch (r.source) {
          case "file":
            content = await fileReplacer(content, r);
            break;
          case "many-files":
            content = await manyFilesReplacer(content, r);
            break;
          default:
            content = content.replace(r.pattern, this.variables[r.name]);
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
        case AIProviderStopReason.Stop: {
          await this.processResponse(step, response.message.content ?? "");
          return {
            action: "continue",
            message: response.message,
          };
        }
        case AIProviderStopReason.Length: {
          return {
            action: "error",
            message: response.message,
            error: new Error(
              "AXIS: Incomplete model output due to `max_tokens` parameter or token limit",
            ),
          };
        }
        case AIProviderStopReason.FunctionCall: {
          // TODO
        }
        default: {
          return {
            action: "error",
            message: response.message,
            error: new Error("AXIS: Unspecified error"),
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
        const filepath = replaceFilePattern(
          output,
          this.variables.file as FilePathInfo,
        );
        await writeFileWithDirectories(filepath, content);
      } else if (response.action === "save-to-variables") {
        this.variables[response.output] = content;
      } else {
        Display.debug?.log("No post action to take");
      }
    }
  }
}
