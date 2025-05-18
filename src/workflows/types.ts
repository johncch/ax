import { AIProvider } from "../ai/types.js";
import { AxleError } from "../errors/AxleError.js";
import { Recorder } from "../recorder/recorder.js";
import { ProgramOptions, Stats, Task } from "../types.js";

export interface Run {
  tasks: Task[];
  variables: Record<string, any>;
}

export interface SerializedExecutionResponse {
  response: string;
  stats: Stats;
}

export interface ChatCommand {
  type: string;
}

export interface WorkflowResult<T = any> {
  response: T;
  stats?: Stats;
  error?: AxleError;
  success: boolean;
}

export interface WorkflowExecutable {
  execute: (context: {
    provider: AIProvider;
    variables: Record<string, any>;
    options?: ProgramOptions;
    stats?: Stats;
    recorder?: Recorder;
  }) => Promise<WorkflowResult>;
}
