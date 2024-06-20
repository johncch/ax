// The validation functions don't really do anything right now
// except print out the config and job files. We'll add more
// ways to ensure the required fields are present later.

export function validateConfig(config, options) {
  if (options.debug) {
    console.log(config);
    console.log("Validating config file");
    console.log("API Key: ", config.providers.openai["api-key"]);
  }
}

export function validateJob(job, options) {
  if (options.debug) {
    console.log(job);
  }
  return job.job;
}
