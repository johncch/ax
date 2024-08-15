import { Command } from "@commander-js/extra-typings";
import { getBatchCommand } from "./commands/batch.js";
import { getEngine } from "./engines/index.js";
import { getConfig, type Config } from "./utils/config.js";
import { getJob, JobConfig } from "./utils/job.js";
import { log } from "./utils/logger.js";

const program = new Command()
  .version("1.0.0")
  .option(
    "--dry-run",
    "Run the application without executing against the AI providers",
  )
  .option("-c, --config <path>", "Path to the config file")
  .option("-j, --job <path>", "Path to the job file")
  .option("-d, --debug", "Print additional debug information")
  .option("--verbose", "Print out the options", false);

program.parse();
const options = program.opts();
export type ProgramOptions = typeof options;

log.setOptions(options);
log.debug?.log(options);

/**
 * Read and load config, job
 */
let config: Config;
let jobConfig: JobConfig;
try {
  config = await getConfig(options.config ?? null, options);
  jobConfig = await getJob(options.job ?? null, options);
} catch (e) {
  console.error(`${e}`);
  program.outputHelp();
  process.exit(1);
}

/**
 * Execute the job
 */
const engine = getEngine(jobConfig.using, config, options);
if (!engine) {
  console.error(`AI Provider is not defined. Please check your job file.`);
  process.exit(1);
}

log.info.log("All systems operational. Running job...");

const stats = {
  in: 0,
  out: 0,
};
for (const [jobName, job] of Object.entries(jobConfig.jobs)) {
  log.info.log(`Executing "${jobName}"`);
  if (job.type == "batch") {
    const executable = await getBatchCommand(job, engine, options);
    await executable.execute(options, stats);
  }
}

log.info.log("Usage");
console.log(`Input tokens: ${stats.in} `);
console.log(`Output tokens: ${stats.out} `);
log.info.log("Complete. Goodbye");
