import { Command } from "@commander-js/extra-typings";
import { executeAgentCommand } from "./commands/agent.js";
import { executeBatchCommand } from "./commands/batch.js";
import { getEngine } from "./providers/index.js";
import { getTools } from "./tools/index.js";
import { getConfig, type Config } from "./utils/config.js";
import { Display } from "./utils/display.js";
import { getJob, isBatchJob, JobConfig } from "./utils/job.js";

const program = new Command()
  .name("axle")
  .description("A CLI tool for running AI jobs")
  .version("1.0.0")
  .option(
    "--dry-run",
    "Run the application without executing against the AI providers",
  )
  .option("-c, --config <path>", "Path to the config file")
  .option("-j, --job <path>", "Path to the job file")
  .option("--no-log", "Do not write the output to a log file")
  .option("-d, --debug", "Print additional debug information")
  .option("--args <args...>", "Additional arguments in the form key=value");

program.parse(process.argv);
const options = program.opts();
export type ProgramOptions = typeof options;

// Parse the additional arguments
const variables: Record<string, string> = {};
if (options.args) {
  options.args.forEach((arg: string) => {
    const [key, value] = arg.split("=");
    if (key && value) {
      variables[key.trim()] = value.trim();
    }
  });
}

Display.setOptions(options);
if (options.log) {
  await Display.initWriter();
}
if (options.debug) {
  Display.debug?.group("Options");
  Display.debug?.log(options);
  Display.debug?.log("Additional Arguments:");
  Display.debug?.log(variables);
}

/**
 * Read and load config, job
 */
let config: Config;
let jobConfig: JobConfig;
try {
  config = await getConfig(options.config ?? null, options);
  jobConfig = await getJob(options.job ?? null, options);
} catch (e) {
  Display.debug?.log(e.stack);
  console.error(`${e.stack}`);
  program.outputHelp();
  process.exit(1);
}

/**
 * Setup tools
 */

const toolManager = getTools(config, options);

/**
 * Execute the job
 */
const engine = getEngine(jobConfig.using, config, options);
if (!engine) {
  console.error(`AI Provider is not valid. Please check your job file.`);
  program.outputHelp();
  process.exit(1);
}

Display.info.group("All systems operational. Running job...");
const startTime = Date.now();
if (options.dryRun) {
  Display.info.log("Dry run mode enabled. No API calls will be made.");
}

const stats = {
  in: 0,
  out: 0,
};
for (const [jobName, job] of Object.entries(jobConfig.jobs)) {
  Display.info.group(`Executing "${jobName}"`);
  if (isBatchJob(job)) {
    await executeBatchCommand(
      job,
      engine,
      toolManager,
      variables,
      options,
      stats,
    );
  } else {
    await executeAgentCommand(
      job,
      engine,
      toolManager,
      variables,
      options,
      stats,
    );
  }
}

Display.info.group("Usage");
Display.info.log(`Total run time: ${Date.now() - startTime}ms`);
Display.info.log(`Input tokens: ${stats.in} `);
Display.info.log(`Output tokens: ${stats.out} `);

Display.info.group("Complete. Goodbye");
