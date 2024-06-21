import {
  pathToComponents,
  replaceFilePattern,
  writeFileWithDirectories,
} from "../utils/file.js";
import { arrayify } from "../utils/iteration.js";
import { glob } from "glob";
import chalk from "chalk";
import fs from "fs/promises";
import ora from "ora";

export async function getBatchJob(job, engine, options) {
  const batchJob = new BatchJob(job, engine);
  await batchJob.setup(options);
  return batchJob;
}

export const BatchJobOptions = {
  "ignore-existing": "Ignores runs where files exist",
};

class BatchJob {
  runs = [];

  constructor(job, engine) {
    this.job = job;
    this.engine = engine;
  }

  async setup(options) {
    if (options.verbose) {
      console.log(`\n${chalk.gray("==>")} Verbose: Setting up batch job`);
    }

    // I don't want to overdesign this right now so I'm just going to do the
    // bare minimum. In the future, can add more functionality to this.
    const iterations = arrayify(this.job.iteration);
    for (const it of iterations) {
      if (it.file && it.file.input) {
        const files = await glob(it.file.input, { withFileTypes: true });
        for (const f of files) {
          const run = {};
          run.file = f.fullpath();
          run.pattern = it.pattern;
          run.output = replaceFilePattern(
            it.file.output,
            pathToComponents(f.relative()),
          );
          if (options.ignoreExisting) {
            try {
              await fs.access(run.output);
              if (options.verbose) {
                console.log(
                  `Skipping run ${run.file} -> ${run.output} because it already exists`,
                );
              }
              continue;
            } catch (e) {
              // do nothing
            }
          }
          this.runs.push(run);
        }
      }
      if (options.verbose) {
        console.log(`runs to be executed: ${this.runs}`);
      }
    }
  }

  async execute(options) {
    const requests = [];
    const ongoingRequests = [];

    if (this.runs.length == 0) {
      return Promise.resolve("No runs to execute.").then(() => {
        console.log(
          `\n${chalk.blue("==>")} ${chalk.whiteBright.bold("No runs to execute.")}`,
        );
      });
    }

    const stats = { in: 0, out: 0 };
    let completed = 0;
    const spinner = ora(`Working on 0/${this.runs.length}`).start();

    for (let idx = 0; idx < this.runs.length; idx++) {
      const p = new Promise(async (resolve, reject) => {
        // Build messages
        const run = this.runs[idx];
        // construct messages
        const systemMsgs = this.job.system;
        let userMsgs = arrayify(this.job.user);
        userMsgs = await this.constructRun(userMsgs, run);
        const messages = [systemMsgs, ...userMsgs];
        // Response variables
        let response = "";

        // Execute
        const request = this.engine.createRequest(systemMsgs, userMsgs);
        if (options.dryRun) {
          console.log(
            `\n${chalk.yellow("==>")} Dry run: will execute  on ${this.engine.name}: ${request.model}`,
          );
          let preview = JSON.stringify(messages);
          if (preview.length >= 999) {
            preview = preview.substring(0, 999) + "...";
          }
          console.log(preview);
        } else {
          try {
            let result = await request.execute();
            response = result.response;
            stats.in += result.stats.in;
            stats.out += result.stats.out;
          } catch (e) {
            console.error(e);
            reject();
          }
        }

        // Process response
        if (run.output) {
          if (options.dryRun) {
            console.log(
              `\n${chalk.yellow("==>")} Dry run: will write to ${run.output}`,
            );
          } else {
            await writeFileWithDirectories(run.output, response);
          }
        }

        completed += 1;
        spinner.text = `Working on ${completed}/${this.runs.length}`;
        resolve();
      });

      requests.push(p);
      ongoingRequests.push(p);
      if (ongoingRequests.length >= options.batchSize) {
        await Promise.all(ongoingRequests);
        ongoingRequests.length = 0;
      }
    }

    return Promise.all(requests).then(() => {
      spinner.succeed(`All jobs (${this.runs.length}) completed`);
      console.log(
        `\n${chalk.blue("==>")} ${chalk.whiteBright.bold("Completion")}:`,
      );
      console.log(`Input tokens: ${stats.in} `);
      console.log(`Output tokens: ${stats.out} `);
    });
  }

  async constructRun(messages, run) {
    const result = [];
    for (const item of messages) {
      if (item.includes(run.pattern)) {
        const content = await fs.readFile(run.file, "utf-8");
        const replacedItem = item.replace(run.pattern, content);
        result.push(replacedItem);
      }
    }

    return result;
  }
}
