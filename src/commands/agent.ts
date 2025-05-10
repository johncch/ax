import { executeChatAction } from "../actions/chat.js";
import { execSaveToVariables, execWriteToDisk } from "../actions/system.js";
import { executeToolAction } from "../actions/tools.js";
import {
  isChatAction,
  isSaveVarAction,
  isToolAction,
  isToolRespondAction,
  isWriteToDiskAction,
} from "../configs/job.js";
import { Job, Step } from "../configs/types.js";
import { Chat } from "../providers/chat.js";
import { AIProvider } from "../providers/types.js";
import { Recorder } from "../recorder/recorder.js";
import { TaskStatus } from "../recorder/types.js";
import { ToolManager } from "../tools/types.js";
import { ProgramOptions, Stats } from "../types.js";
import { DynamicArrayIterator } from "../utils/iterator.js";
import { friendly } from "../utils/utils.js";
import { Keys } from "../utils/variables.constants.js";
import { SerializedExecutionResponse } from "./types.js";

export async function executeAgentCommand(
  job: Job,
  provider: AIProvider,
  toolManager: ToolManager,
  variables: Record<string, any>,
  options?: ProgramOptions,
  stats?: Stats,
  recorder?: Recorder,
): Promise<SerializedExecutionResponse> {
  const id = crypto.randomUUID();
  const { steps } = job;

  recorder.info.log({
    type: "task",
    id,
    status: TaskStatus.Running,
    message: `[${friendly(id)}] Starting job`,
  });

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
    recorder.info.log({
      type: "task",
      status: TaskStatus.Running,
      id,
      message: `[${friendly(id)}] Processing step ${index + 1}: ${step.action}`,
    });

    if (isChatAction(step) || isToolRespondAction(step)) {
      const { action, error, toolCalls } = await executeChatAction({
        step,
        chat,
        provider,
        stats,
        variables,
        options,
        recorder,
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
          recorder,
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
        recorder,
      });
    } else if (isWriteToDiskAction(step)) {
      await execWriteToDisk({
        action: step,
        variables,
        options,
        recorder,
      });
    }
  }

  if (hasError) {
    recorder.info.log({
      type: "task",
      status: TaskStatus.Fail,
      id,
      message: `[${friendly(id)}] Failed`,
    });
  } else {
    recorder.info.log({
      type: "task",
      status: TaskStatus.Success,
      id,
      message: `[${friendly(id)}] Completed ${iterator.length} steps`,
    });
  }

  return {
    response: variables[Keys.Latest],
    stats,
  };
}
