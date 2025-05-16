import { Chat } from "../ai/chat.js";
import { AIProvider } from "../ai/types.js";
import { SerialJob } from "../cli/configs/types.js";
import { configToTasks } from "../cli/utils.js";
import { Recorder } from "../recorder/recorder.js";
import { TaskStatus } from "../recorder/types.js";
import { createNodeRegistry } from "../registry/nodeRegistryFactory.js";
import { ProgramOptions, Stats, Task } from "../types.js";
import { friendly } from "../utils/utils.js";
import { Keys } from "../utils/variables.constants.js";
import { WorkflowExecutable } from "./types.js";

interface SerialWorkflow {
  (jobConfig: SerialJob): WorkflowExecutable;
  (...instructions: Task[]): WorkflowExecutable;
}

export const serialWorkflow: SerialWorkflow = (
  first: SerialJob | Task,
  ...rest: Task[]
) => {
  const prepare = async (context: { recorder?: Recorder }) => {
    const { recorder } = context;
    let tasks: Task[] = [];
    if ("type" in first && first.type === "serial") {
      const jobConfig = first as SerialJob;
      tasks = await configToTasks(jobConfig, { recorder });
    } else {
      tasks = [first as Task, ...rest];
    }
    return tasks;
  };

  const execute = async (context: {
    provider: AIProvider;
    variables: Record<string, any>;
    options?: ProgramOptions;
    stats?: Stats;
    recorder?: Recorder;
  }) => {
    const { provider, variables, options, stats, recorder } = context;
    const id = crypto.randomUUID();
    const actionRegistry = createNodeRegistry();

    recorder.info.log({
      type: "task",
      id,
      status: TaskStatus.Running,
      message: `[${friendly(id)}] Starting job`,
    });

    const tasks = await prepare({ recorder });
    const chat = new Chat();
    let hasError = false;

    for (const [index, task] of tasks.entries()) {
      recorder.info.log({
        type: "task",
        id,
        status: TaskStatus.Running,
        message: `[${friendly(id)}] Processing step ${index + 1}: ${task.type}`,
      });

      try {
        await actionRegistry.executeTask({
          task,
          chat,
          provider,
          variables,
          options,
          stats,
          recorder,
        });
      } catch (error) {
        hasError = true;
        console.error(error);
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
        message: `[${friendly(id)}] Completed ${tasks.length} steps`,
      });
    }

    return {
      response: variables[Keys.Latest],
      stats,
    };
  };

  return { execute };
};
