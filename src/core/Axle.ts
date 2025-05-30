import { getProvider } from "../ai/index.js";
import { AIProvider, AIProviderConfig } from "../ai/types.js";
import { AxleError } from "../errors/index.js";
import { Recorder } from "../recorder/recorder.js";
import { Task } from "../types.js";
import { serialWorkflow } from "../workflows/serial.js";
import { WorkflowResult } from "../workflows/types.js";

export class Axle {
  private provider: AIProvider;
  private stats = { in: 0, out: 0 };
  private variables: Record<string, any> = {};
  private recorder = new Recorder();

  constructor(config: Partial<AIProviderConfig>) {
    if (Object.entries(config).length !== 1) {
      throw new AxleError("Must have exactly one config");
    }

    try {
      const provider = Object.keys(config)[0] as keyof AIProviderConfig;
      const providerConfig = config[provider];
      this.provider = getProvider(provider, providerConfig);
    } catch (error) {
      const axleError =
        error instanceof AxleError
          ? error
          : new AxleError("Failed to initialize provider", {
              code: "PROVIDER_INIT_ERROR",
              cause: error instanceof Error ? error : new Error(String(error)),
            });
      throw axleError;
    }
  }

  /**
   * The execute function takes in a list of Tasks
   * @param tasks
   * @returns
   */
  async execute(...tasks: Task[]): Promise<WorkflowResult> {
    try {
      let result: WorkflowResult;
      result = await serialWorkflow(...tasks).execute({
        provider: this.provider,
        variables: this.variables,
        stats: this.stats,
        recorder: this.recorder,
      });

      return result;
    } catch (error) {
      const axleError =
        error instanceof AxleError
          ? error
          : new AxleError("Execution failed", {
              cause: error instanceof Error ? error : new Error(String(error)),
            });
      this.recorder.error?.log(axleError);
      return { response: null, error: axleError, success: false };
    }
  }

  get logs() {
    return this.recorder.getLogs();
  }
}
