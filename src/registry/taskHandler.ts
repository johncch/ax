import { Recorder } from "../recorder/recorder.js";
import { ProgramOptions, Task } from "../types.js";

export interface TaskHandler<T extends Task> {
  readonly taskType: string;

  // Method to check if an action is compatible with this handler
  canHandle(action: any): action is T;

  // Method to execute the action
  execute(params: {
    task: T;
    variables: Record<string, any>;
    options?: ProgramOptions;
    recorder?: Recorder;
    // Add other common parameters as needed
    [key: string]: any;
  }): Promise<void>;
}
