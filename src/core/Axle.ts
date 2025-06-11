import { getProvider } from "../ai/index.js";
import { AIProvider, AIProviderConfig } from "../ai/types.js";
import { AxleError } from "../errors/index.js";
import { Recorder } from "../recorder/recorder.js";
import { RecorderWriter } from "../recorder/types.js";
import { Task } from "../types.js";
import {
  Base64FileInfo,
  FileInfo,
  TextFileInfo,
  loadFileContent,
} from "../utils/file.js";
import { dagWorkflow } from "../workflows/dag.js";
import { serialWorkflow } from "../workflows/serial.js";
import {
  DAGDefinition,
  DAGWorkflowOptions,
  WorkflowResult,
} from "../workflows/types.js";

export class Axle {
  private provider: AIProvider;
  private stats = { in: 0, out: 0 };
  private variables: Record<string, any> = {};
  recorder = new Recorder();

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

  addWriter(writer: RecorderWriter) {
    this.recorder.subscribe(writer);
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

  /**
   * Execute a DAG workflow
   * @param dagDefinition - The DAG definition object
   * @param variables - Additional variables to pass to the workflow
   * @param options - DAG execution options
   * @returns Promise<WorkflowResult>
   */
  async executeDAG(
    dagDefinition: DAGDefinition,
    variables: Record<string, any> = {},
    options?: DAGWorkflowOptions,
  ): Promise<WorkflowResult> {
    try {
      const workflow = dagWorkflow(dagDefinition, options);
      const result = await workflow.execute({
        provider: this.provider,
        variables: { ...this.variables, ...variables },
        stats: this.stats,
        recorder: this.recorder,
      });

      return result;
    } catch (error) {
      const axleError =
        error instanceof AxleError
          ? error
          : new AxleError("DAG execution failed", {
              cause: error instanceof Error ? error : new Error(String(error)),
            });
      this.recorder.error?.log(axleError);
      return { response: null, error: axleError, success: false };
    }
  }

  get logs() {
    return this.recorder.getLogs();
  }

  /**
   * Load a file with the specified encoding or auto-detect based on file extension
   * @param filePath - Path to the file
   * @param encoding - How to load the file: "utf-8" for text, "base64" for binary, or omit for auto-detection
   * @returns FileInfo object with appropriate content based on encoding
   */
  static async loadFileContent(filePath: string): Promise<FileInfo>;
  static async loadFileContent(
    filePath: string,
    encoding: "utf-8",
  ): Promise<TextFileInfo>;
  static async loadFileContent(
    filePath: string,
    encoding: "base64",
  ): Promise<Base64FileInfo>;
  static async loadFileContent(
    filePath: string,
    encoding?: "utf-8" | "base64",
  ): Promise<FileInfo> {
    if (encoding === "utf-8") {
      return loadFileContent(filePath, "utf-8");
    } else if (encoding === "base64") {
      return loadFileContent(filePath, "base64");
    } else {
      return loadFileContent(filePath);
    }
  }
}
