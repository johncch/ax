import { executeAgentCommand } from "../commands/agent.js";
import {
  Job,
  ProviderConfig,
  ToolProviderConfig,
  Using,
} from "../configs/types.js";
import { getProvider } from "../providers/index.js";
import { AIProvider } from "../providers/types.js";
import { Recorder } from "../recorder/recorder.js";
import { getTools } from "../tools/index.js";
import { ToolManager } from "../tools/types.js";

export class Axle {
  private provider: AIProvider;
  private toolManager: ToolManager;
  private stats = { in: 0, out: 0 };
  private variables: Record<string, any> = {};
  private recorder = new Recorder();

  constructor(config: ProviderConfig) {
    // TODO: this is a bad hack, clean up the signatures later
    const keys = Object.keys(config);
    const useConfig = { engine: keys[0] } as Using;
    this.provider = getProvider(useConfig, config, null, this.recorder);
    this.toolManager = getTools(config, null, this.recorder);
  }

  use(toolConfig: ToolProviderConfig): Axle {
    this.toolManager = getTools(toolConfig);
    return this;
  }

  // TODO:
  // - Add variables when the need arises
  async execute(job: Job): Promise<any> {
    return await executeAgentCommand(
      job,
      this.provider,
      this.toolManager,
      this.variables,
      null,
      this.stats,
      this.recorder,
    );
  }

  get logs() {
    return this.recorder.getLogs();
  }
}
