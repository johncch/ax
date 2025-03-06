import { randomUUID } from "node:crypto";
import { executeChatAction } from "../actions/chat.js";
import { execSaveToVariables, execWriteToDisk } from "../actions/system.js";
import { executeToolAction } from "../actions/tools.js";
import { ProgramOptions } from "../index.js";
import { AIProvider, Chat } from "../providers/types.js";
import { ToolManager } from "../tools/index.js";
import { Display } from "../utils/display.js";
import { DynamicArrayIterator } from "../utils/iterator.js";
import {
  isChatAction,
  isSaveVarAction,
  isToolAction,
  isToolRespondAction,
  isWriteToDiskAction,
  Job,
  Step,
} from "../utils/job.js";
import { Stats } from "../utils/stats.js";
import { friendly } from "../utils/utils.js";

export async function executeAgentCommand(
  job: Job,
  provider: AIProvider,
  toolManager: ToolManager,
  variables: Record<string, any>,
  options: ProgramOptions,
  stats: Stats,
) {
  const id = randomUUID();
  const { steps } = job;

  Display.progress.add(id, `[${friendly(id)}] Starting job`);
  const chat = new Chat();
  if (job.tools) {
    const toolSchemas = toolManager.getSchemas(job.tools);
    chat.setToolSchemas(toolSchemas);
  }
  if (job.variables) {
    for (const [key, value] of Object.entries(job.variables)) {
      variables[key] = value;
    }
  }

  let hasError = false;
  const iterator = new DynamicArrayIterator<Step>(steps);

  for (const [index, step] of iterator) {
    Display.progress.update(
      id,
      `[${friendly(id)}] Processing step ${index + 1}: ${step.action}`,
    );
    if (isChatAction(step) || isToolRespondAction(step)) {
      const { action, error, toolCalls } = await executeChatAction({
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
      if (action == "toolCall") {
        if (toolCalls) {
          iterator.addItem({
            action: "tool-respond",
            toolCalls: toolCalls,
          });
          iterator.addItem({
            action: "tool-call",
            toolCalls: toolCalls,
          });
        }
      }
    } else if (isToolAction(step)) {
      try {
        await executeToolAction({
          step,
          toolManager,
          variables,
          options,
        });
      } catch (error) {
        hasError = true;
        console.error(error);
      }
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
    Display.progress.succeed(
      id,
      `[${friendly(id)}] completed ${iterator.length} steps`,
    );
  }
}
