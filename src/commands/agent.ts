import { randomUUID } from "node:crypto";
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

export async function executeAgentCommand(
  job: Job,
  provider: AIProvider,
  variables: Record<string, any>,
  options: ProgramOptions,
  stats: Stats,
) {
  const id = randomUUID();
  const { steps } = job;

  Display.progress.add(id, `[${friendly(id)}] Starting job`);
  const chat = new Chat();
  let hasError = false;

  for (const [index, step] of steps.entries()) {
    Display.progress.update(
      id,
      `[${friendly(id)}] Processing step ${index + 1}: ${step.action}`,
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
    Display.progress.fail(id, `[${friendly(id)}] Failed`);
  } else {
    Display.progress.succeed(id, `[${friendly(id)}] complete`);
  }
}
