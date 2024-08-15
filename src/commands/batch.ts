import { glob } from "glob";
import { arrayify } from "../utils/iteration";
import { log } from "../utils/logger";
import { readFile } from "node:fs/promises";
import { pathToComponents } from "../utils/file";
import { getAgentJob } from "./agent";
import { Job } from "../utils/job";
import { ProgramOptions } from "../bin";
import { AIProvider } from "../engines";
import { Stats } from "../utils/stats";
import ora from "ora";

interface Run {
  job: Job;
  variables: Record<string, any>;
}

export async function getBatchJob(
  job: Job,
  engine: AIProvider,
  options: ProgramOptions,
) {
  const batchJob = new BatchJob(job, engine);
  await batchJob.setup(options);
  return batchJob;
}

class BatchJob {
  job: Job;
  provider: AIProvider;
  runs: Run[] = [];

  constructor(job: Job, engine: AIProvider) {
    this.job = job;
    this.provider = engine;
  }

  async setup(options) {
    log.verbose?.log("Setting up batch job");
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

  async execute(options: ProgramOptions, stats: Stats) {
    const requests: Promise<void>[] = [];
    const ongoingRequests: Promise<void>[] = [];
    if (this.runs.length == 0) {
      return Promise.resolve("No runs to execute.").then(() => {
        log.info.log("No runs to execute");
      });
    }

    let completed = 0;
    const spinner = ora(`Working on 0/${this.runs.length}`).start();

    for (let idx = 0; idx < this.runs.length; idx++) {
      const run = this.runs[idx];
      const p = new Promise<void>(async (resolve, reject) => {
        const agent = await getAgentJob(run.job, this.provider, run.variables);
        try {
          await agent.execute(options, stats);
          resolve();
        } catch (e) {
          console.error(e);
          reject();
        } finally {
          completed += 1;
          spinner.text = `Working on ${completed}/${this.runs.length}`;
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
      spinner.succeed(`All jobs (${this.runs.length}) completed`);
    });
  }
}
