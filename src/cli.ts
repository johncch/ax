import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import { getProvider } from "./ai/index.js";
import { AIProvider } from "./ai/types.js";
import { isBatchJob } from "./cli/configs/job.js";
import { getJobConfig, getProviderConfig } from "./cli/configs/loaders.js";
import { JobConfig, ProviderConfig } from "./cli/configs/types.js";
import { ConsoleWriter } from "./recorder/consoleWriter.js";
import { LogWriter } from "./recorder/logWriter.js";
import { Recorder } from "./recorder/recorder.js";
import { LogLevel } from "./recorder/types.js";
import { getToolRegistry } from "./tools/index.js";
import { Stats } from "./types.js";
import { concurrentWorkflow } from "./workflows/concurrent.js";
import { serialWorkflow } from "./workflows/serial.js";

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
  .option("--no-warn-unused", "Do not warn about unused variables")
  .option("-d, --debug", "Print additional debug information")
  .option(
    "--truncate <num>",
    "Truncate printed strings to a certain number of characters, 0 to disable",
    parseInt,
    100,
  )
  .option("--args <args...>", "Additional arguments in the form key=value");

program.parse(process.argv);
const options = program.opts();

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

// Create a new Recorder instance
const recorder = new Recorder();
if (options.debug) {
  recorder.level = LogLevel.Debug;
}
const consoleWriter = new ConsoleWriter(options);
recorder.subscribe(consoleWriter);
if (options.log) {
  const logWriter = new LogWriter();
  await logWriter.initialize();
  recorder.subscribe(logWriter);
}

if (options.debug) {
  recorder.debug?.log({ kind: "heading", message: "Options" });
  recorder.debug?.log(options);
  recorder.debug?.log("Additional Arguments:");
  recorder.debug?.log(variables);
}

/**
 * Read and load config, job
 */
let serviceConfig: ProviderConfig;
let jobConfig: JobConfig;
try {
  serviceConfig = await getProviderConfig({
    configPath: options.config ?? null,
    options,
    recorder,
  });
  jobConfig = await getJobConfig({
    path: options.job ?? null,
    options,
    recorder,
  });
} catch (e) {
  console.error(`${chalk.red(e.message)}`);
  console.error(e.stack);
  recorder.debug?.log(e.stack);
  console.log("");
  program.outputHelp();
  process.exit(1);
}

/**
 * Execute the job
 */
let provider: AIProvider;
try {
  provider = getProvider({
    useConfig: jobConfig.using,
    config: serviceConfig,
    options,
    recorder,
  });
} catch (e) {
  console.error(`${chalk.red(e.message)}`);
  recorder.debug?.log(e.stack);
  console.log("");
  program.outputHelp();
  process.exit(1);
}

getToolRegistry().setConfig(serviceConfig);

recorder.info.log({
  kind: "heading",
  message: "All systems operational. Running job...",
});
const startTime = Date.now();
if (options.dryRun) {
  recorder.info.log("Dry run mode enabled. No API calls will be made.");
}

const stats: Stats = { in: 0, out: 0 };
for (const [jobName, job] of Object.entries(jobConfig.jobs)) {
  recorder.info.log({ kind: "heading", message: `Executing "${jobName}"` });
  let response: any;
  if (isBatchJob(job)) {
    response = await concurrentWorkflow(job).execute({
      provider,
      variables,
      options,
      stats,
      recorder,
    });
  } else {
    response = await serialWorkflow(job).execute({
      provider,
      variables,
      options,
      stats,
      recorder,
    });
  }
  if (response) {
    recorder.info.log(response);
  }
}

recorder.info.log({ kind: "heading", message: "Usage" });
recorder.info.log(`Total run time: ${Date.now() - startTime}ms`);
recorder.info.log(`Input tokens: ${stats.in} `);
recorder.info.log(`Output tokens: ${stats.out} `);

recorder.info.log({ kind: "heading", message: "Complete. Goodbye" });
