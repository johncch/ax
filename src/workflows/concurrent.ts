import { AIProvider } from "../ai/types.js";
import { BatchJob } from "../cli/configs/types.js";
import { configToPlanner, configToTasks } from "../cli/utils.js";
import { AxleError } from "../errors/AxleError.js";
import { Recorder } from "../recorder/recorder.js";
import { TaskStatus } from "../recorder/types.js";
import { ProgramOptions, Stats, Task } from "../types.js";
import {
  createErrorResult,
  createResult,
  isErrorResult,
} from "../utils/result.js";
import { FileRunPlanner } from "./planners/fileRunPlanner.js";
import { Planner } from "./planners/types.js";
import { serialWorkflow } from "./serial.js";
import { Run, WorkflowExecutable, WorkflowResult } from "./types.js";

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
  }): Promise<WorkflowResult> => {
    const { provider, variables, options, stats, recorder } = context;

    const id = crypto.randomUUID();

    try {
      const [planner, tasks] = await prepare({ recorder });
      const runs = await planner.plan(tasks);
      recorder?.debug?.heading.log("Runs", runs);

      if (runs.length === 0) {
        recorder?.info?.log("No runs to execute");
        return createResult([], stats);
      }

      let completed = 0;
      recorder?.info?.log({
        type: "task",
        status: TaskStatus.Running,
        id,
        message: `Working on 0/${runs.length}`,
      });

      const executeRun = async (run: Run) => {
        try {
          const result = await serialWorkflow(...run.tasks).execute({
            provider: provider,
            variables: { ...run.variables, ...variables },
            options,
            stats,
            recorder,
          });
          return result;
        } catch (e) {
          const error =
            e instanceof AxleError
              ? e
              : new AxleError(`Error executing run`, {
                  cause: e instanceof Error ? e : new Error(String(e)),
                });
          recorder?.error?.log(error);
          return createErrorResult(error, null, stats);
        } finally {
          completed++;
          recorder?.info?.log({
            type: "task",
            status: TaskStatus.Running,
            id,
            message: `Working on ${completed}/${runs.length}`,
          });
        }
      };

      const concurrentRuns = 5;
      let batchResults: WorkflowResult[] = [];

      for (let i = 0; i < runs.length; i += concurrentRuns) {
        const batch = runs.slice(i, i + concurrentRuns);
        const results = await Promise.all(batch.map(executeRun));
        batchResults = batchResults.concat(results);
      }

      // Check if any run had errors but continue execution
      const hasErrors = batchResults.some(isErrorResult);

      recorder?.info?.log({
        type: "task",
        status: hasErrors ? TaskStatus.PartialSuccess : TaskStatus.Success,
        id,
        message: `All jobs (${runs.length}) completed${hasErrors ? " with some errors" : ""}`,
      });

      // Process all results, including those with errors
      const response = batchResults.map((r) => r.response);
      return createResult(response, stats);
    } catch (error) {
      const axleError =
        error instanceof AxleError
          ? error
          : new AxleError(`Concurrent workflow execution failed`, {
              id: id,
              cause: error instanceof Error ? error : new Error(String(error)),
            });

      recorder?.error?.log(axleError);
      return createErrorResult(axleError, null, stats);
    }
  };

  return { execute };
};
