#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import { readInputFile } from "../src/utils/file.js";
import { validateConfig, validateJob } from "../src/utils/validation.js";
import { getBatchJob } from "../src/commands/batch.js";
import { getEngine } from "../src/engines/index.js";

program
  .version("1.0.0")
  .option(
    "--dry-run",
    "Run the application without executing against the AI providers",
  )
  .option("--debug", "Print additional debug information")
  .option("--verbose", "Print out the options", false);

program.parse();
const options = program.opts();

if (options.debug) {
  console.log(options);
}

/*
 * First we read config keys.
 * This is a yaml file that contains the API keys for the various services.
 * Right now this is per project, but we might do a global config in the future.
 */

const CONFIG_FILE_NAME = "ax-config.yml";

let configFile = {};
try {
  configFile = await readInputFile(CONFIG_FILE_NAME);
} catch (e) {
  if (e.code !== "ENOENT") {
    console.error(`Error reading config file: ${e}`);
  } else {
    console.error(`Please create a config file at ${CONFIG_FILE_NAME}`);
  }
  program.outputHelp();
  process.exit(1);
}
validateConfig(configFile, options);

/**
 * Read the job file to get the right engine and job executor
 */

const JOB_FILE_NAME = "ax-job.yml";

let jobDef = {};
try {
  jobDef = await readInputFile(JOB_FILE_NAME);
} catch (e) {
  if (e.code != "EOENT") {
    console.error(`Error reading job file: ${e}`);
  } else {
    console.error(`Please create a job file at ${JOB_FILE_NAME}`);
  }
  program.outputHelp();
  process.exit(1);
}
jobDef = validateJob(jobDef, options);

/**
 * Execute the job
 */

const engine = getEngine(jobDef.engine, configFile, options);
if (!engine) {
  console.error(`AI Provider is not defined. Please check your job file.`);
  process.exit(1);
}

console.log(
  `${chalk.blue("==>")} ${chalk.whiteBright.bold("All systems operational. Running job...")}`,
);

if (jobDef.type == "batch") {
  const job = await getBatchJob(jobDef, engine, options);
  await job.execute(options);
}

console.log(
  `\n${chalk.blue("==>")} ${chalk.whiteBright.bold("Complete. Goodbye")}`,
);
