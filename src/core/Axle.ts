import { getProvider } from "../ai/index.js";
import { AIProvider } from "../ai/types.js";
import { Job, ProviderConfig, Using } from "../cli/configs/types.js";
import { Recorder } from "../recorder/recorder.js";
import { serialWorkflow } from "../workflows/serial.js";

export class Axle {
  private provider: AIProvider;
  private stats = { in: 0, out: 0 };
  private variables: Record<string, any> = {};
  private recorder = new Recorder();

  constructor(config: ProviderConfig) {
    // TODO: this is a bad hack, clean up the signatures later
    const keys = Object.keys(config);
    const useConfig = { engine: keys[0] } as Using;
    this.provider = getProvider({
      useConfig,
      config,
      recorder: this.recorder,
    });
  }

  async execute(job: Job): Promise<any> {
    return await serialWorkflow(job).execute({
      provider: this.provider,
      variables: this.variables,
      stats: this.stats,
      recorder: this.recorder,
    });
  }

  get logs() {
    return this.recorder.getLogs();
  }
}
