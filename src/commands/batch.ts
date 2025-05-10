import { glob } from "glob";
import { readFile } from "node:fs/promises";
import { BatchJob, SkipOptions } from "../configs/types.js";
import { AIProvider } from "../providers/types.js";
import { Recorder } from "../recorder/recorder.js";
import { TaskStatus } from "../recorder/types.js";
import { ToolManager } from "../tools/types.js";
import { ProgramOptions, Stats } from "../types.js";
import { fileExists, pathToComponents } from "../utils/file.js";
import { FilePathInfo } from "../utils/types.js";
import { arrayify } from "../utils/utils.js";
import { executeAgentCommand } from "./agent.js";
import { Run } from "./types.js";

export async function executeBatchCommand(
  job: BatchJob,
  engine: AIProvider,
  toolManager: ToolManager,
  variables: Record<string, any>,
  options: ProgramOptions,
  stats: Stats,
  recorder?: Recorder,
) {
  const id = crypto.randomUUID();
  const runs: Run[] = [];

  if (!job.batch) {
    throw new Error("Batch job is missing batch field");
  }

  const batches = arrayify(job.batch);
  for (const batch of batches) {
    if (batch.type === "files") {
      const input = batch.input;
      const files = await glob(input, { withFileTypes: true });

      for (const f of files) {
        const filePath = f.fullpath();
        const components = pathToComponents(filePath);
        const shouldSkip = await processSkipRules(
          batch["skip-condition"],
          components,
        );
        if (!shouldSkip) {
          const content = await readFile(filePath, "utf-8");
          const run: Run = {
            variables: {
              content,
              file: components,
            },
            job,
          };
          runs.push(run);
        }
      }
    }
  }

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
    try {
      await executeAgentCommand(
        run.job,
        engine,
        toolManager,
        { ...run.variables, ...variables },
        options,
        stats,
        recorder,
      );
    } catch (e) {
      console.error(e);
    } finally {
      completed++;
      recorder.info.log({
        type: "task",
        status: TaskStatus.Running,
        id,
        message: `Working on ${completed}/${runs.length}`,
      });
    }
  };

  const concurrentRuns = 5;
  for (let i = 0; i < runs.length; i += concurrentRuns) {
    const batch = runs.slice(i, i + concurrentRuns);
    await Promise.all(batch.map(executeRun));
  }

  recorder.info.log({
    type: "task",
    status: TaskStatus.Success,
    id,
    message: `All jobs (${runs.length}) completed`,
  });
}

async function processSkipRules(
  skipOptions: SkipOptions[] | undefined,
  filePaths: FilePathInfo | null,
): Promise<boolean> {
  if (skipOptions) {
    let allSkipOptions = arrayify(skipOptions);
    for (const skip of allSkipOptions) {
      if (
        skip.folder &&
        skip.contains &&
        skip.contains === "fileNameStem" &&
        filePaths
      ) {
        return await fileExists(filePaths.fileNameStem, skip.folder);
      }
    }
  }
  return false;
}
