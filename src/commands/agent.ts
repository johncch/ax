import { type UUID, randomUUID } from "node:crypto";
import { executeChatAction } from "../actions/chat.js";
import { execSaveToVariables, execWriteToDisk } from "../actions/system.js";
import { ProgramOptions } from "../index.js";
import { AIProvider, Chat } from "../providers/types.js";
import { Display } from "../utils/display.js";
import {
  isChatAction,
  isSaveVarAction,
  isWriteToDiskAction,
  Job,
} from "../utils/job.js";
import { Stats } from "../utils/stats.js";
import { friendly } from "../utils/utils.js";

export async function getAgentCommand(job: Job, provider: AIProvider) {
  const agentJob = new AgentJob(job, provider);
  return agentJob;
}

export class AgentJob {
  type = "agent";
  id: UUID;
  job: Job;
  provider: AIProvider;

  constructor(job: Job, provider: AIProvider) {
    this.id = randomUUID();
    this.job = job;
    this.provider = provider;
  }

  async execute(
    variables: Record<string, any>,
    options: ProgramOptions,
    stats: Stats,
  ) {
    const { job, provider } = this;
    const { steps } = job;

    Display.progress.add(this.id, `[${friendly(this.id)}] Starting job`);
    const chat = new Chat();
    let hasError = false;
    for (const [index, step] of steps.entries()) {
      Display.progress.update(
        this.id,
        `[${friendly(this.id)}] Processing step ${index + 1}: ${step.action}`,
      );
      if (isChatAction(step)) {
        const { action, error } = await executeChatAction({
          step,
          chat,
          provider,
          stats,
          variables,
          options,
        });
        if (error) {
          hasError = true;
          console.error(error);
        }
        // Otherwise we just continue
        // TODO: implement tool use
      } else if (isSaveVarAction(step)) {
        execSaveToVariables({
          action: step,
          variables,
          options,
        });
      } else if (isWriteToDiskAction(step)) {
        await execWriteToDisk({
          action: step,
          variables,
          options,
        });
      }
    }
    if (hasError) {
      Display.progress.fail(this.id, `[${friendly(this.id)}] Failed`);
    } else {
      Display.progress.succeed(this.id, `[${friendly(this.id)}] complete`);
    }
  }
}
