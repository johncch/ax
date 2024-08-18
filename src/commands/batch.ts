import { glob } from "glob";
import { readFile } from "node:fs/promises";
import { AIProvider } from "../providers/types.js";
import { ProgramOptions } from "../index.js";
import { fileExists, FilePathInfo, pathToComponents } from "../utils/file.js";
import { arrayify } from "../utils/utils.js";
import { BatchJob, SkipOptions } from "../utils/job.js";
import { Display } from "../utils/display.js";
import { Stats } from "../utils/stats.js";
import { getAgentCommand } from "./agent.js";
import { type UUID, randomUUID } from "node:crypto";

interface Run {
  job: BatchJob;
  variables: Record<string, any>;
}

export async function getBatchCommand(
  job: BatchJob,
  engine: AIProvider,
  options: ProgramOptions,
) {
  const batchJob = new BatchCommand(job, engine);
  await batchJob.setup(options);
  return batchJob;
}

class BatchCommand {
  id: UUID;
  job: BatchJob;
  provider: AIProvider;
  runs: Run[] = [];

  constructor(job: BatchJob, engine: AIProvider) {
    this.id = randomUUID();
    this.job = job;
    this.provider = engine;
  }

  async setup(options) {
    if (!this.job.batch) {
      throw new Error("Batch job is missing batch field");
    }

    const batches = arrayify(this.job.batch);
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
              job: this.job,
            };
            this.runs.push(run);
          }
        }
      }
    }
  }

  async execute(options: ProgramOptions, stats: Stats) {
    const requests: Promise<void>[] = [];
    const ongoingRequests: Promise<void>[] = [];
    if (this.runs.length == 0) {
      return Promise.resolve("No runs to execute.").then(() => {
        Display.info.log("No runs to execute");
      });
    }

    let completed = 0;
    Display.progress.add(this.id, `Working on 0/${this.runs.length}`);

    for (let idx = 0; idx < this.runs.length; idx++) {
      const run = this.runs[idx];
      const p = new Promise<void>(async (resolve, reject) => {
        const agent = await getAgentCommand(
          run.job,
          this.provider,
          run.variables,
        );
        try {
          await agent.execute(options, stats);
          resolve();
        } catch (e) {
          console.error(e);
          reject();
        } finally {
          completed += 1;
          Display.progress.add(
            this.id,
            `Working on ${completed}/${this.runs.length}`,
          );
        }
      });

      requests.push(p);
      ongoingRequests.push(p);
      if (ongoingRequests.length >= 5) {
        await Promise.all(ongoingRequests);
        ongoingRequests.length = 0;
      }
    }

    return Promise.all(requests).then(() => {
      Display.progress.succeed(
        this.id,
        `All jobs (${this.runs.length}) completed`,
      );
    });
  }
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
