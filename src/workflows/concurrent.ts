import { AIProvider } from "../ai/types.js";
import { BatchJob } from "../cli/configs/types.js";
import { configToPlanner, configToTasks } from "../cli/utils.js";
import { Recorder } from "../recorder/recorder.js";
import { TaskStatus } from "../recorder/types.js";
import { ProgramOptions, Stats, Task } from "../types.js";
import { FileRunPlanner } from "./planners/fileRunPlanner.js";
import { Planner } from "./planners/types.js";
import { serialWorkflow } from "./serial.js";
import { Run, WorkflowExecutable } from "./types.js";

interface ConcurrentWorkflow {
  (jobConfig: BatchJob): WorkflowExecutable;
  (batch: FileRunPlanner, ...instructions: Task[]): WorkflowExecutable;
}

export const concurrentWorkflow: ConcurrentWorkflow = (
  first: BatchJob | FileRunPlanner,
  ...rest: Task[]
) => {
  const prepare = async (context: {
    recorder?: Recorder;
  }): Promise<[Planner, Task[]]> => {
    const { recorder } = context;
    let tasks: Task[] = [];
    let planner: Planner = null;
    if ("type" in first && first.type === "batch") {
      const jobConfig = first as BatchJob;
      planner = await configToPlanner(jobConfig, { recorder });
      tasks = await configToTasks(jobConfig, { recorder });
    } else {
      planner = first as Planner;
      tasks = [...rest];
    }
    return [planner, tasks];
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
    const [planner, tasks] = await prepare({ recorder });
    const runs = await planner.plan(tasks);
    recorder?.debug?.log({ kind: "heading", message: "Runs", runs });

    if (runs.length === 0) {
      recorder?.info.log("No runs to execute");
      return;
    }

    let completed = 0;
    recorder.info.log({
      type: "task",
      status: TaskStatus.Running,
      id,
      message: `Working on 0/${runs.length}`,
    });

    const executeRun = async (run: Run) => {
      let result: any;
      try {
        result = await serialWorkflow(...run.tasks).execute({
          provider: provider,
          variables: { ...run.variables, ...variables },
          options,
          stats,
          recorder,
        });
      } catch (e) {
        console.error(e);
        result = {
          error: e,
        };
      } finally {
        completed++;
        recorder.info.log({
          type: "task",
          status: TaskStatus.Running,
          id,
          message: `Working on ${completed}/${runs.length}`,
        });
      }
      return result;
    };

    const concurrentRuns = 5;
    let batchResults: any[] = [];
    for (let i = 0; i < runs.length; i += concurrentRuns) {
      const batch = runs.slice(i, i + concurrentRuns);
      const results = await Promise.all(batch.map(executeRun));
      batchResults = batchResults.concat(results);
    }

    recorder.info.log({
      type: "task",
      status: TaskStatus.Success,
      id,
      message: `All jobs (${runs.length}) completed`,
    });

    return {
      response: batchResults.map((r) => {
        const { stats, ...rest } = r;
        return rest;
      }),
      stats,
    };
  };

  return { execute };
};
