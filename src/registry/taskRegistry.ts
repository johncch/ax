import { Recorder } from "../recorder/recorder.js";
import { ProgramOptions, Task } from "../types.js";
import { TaskHandler } from "./taskHandler.js";

export class TaskRegistry {
  private handlers: Map<string, TaskHandler<any>> = new Map();

  // Register a new action handler
  register<T extends Task>(handler: TaskHandler<T>): void {
    this.handlers.set(handler.taskType, handler);
  }

  // Get handler for a specific action
  getHandler(task: Task): TaskHandler<any> | undefined {
    return this.handlers.get(task.type);
  }

  // Check if handler exists for an action
  hasHandler(task: Task): boolean {
    return this.handlers.has(task.type);
  }

  // Execute an action using the appropriate handler
  async executeTask<T extends Task>(params: {
    task: T;
    variables: Record<string, any>;
    options?: ProgramOptions;
    recorder?: Recorder;
    [key: string]: any;
  }): Promise<void> {
    const { task } = params;
    const taskType = task.type;
    const handler = this.getHandler(task);

    if (!handler) {
      throw new Error(`No handler registered for action type: ${taskType}`);
    }

    if (!handler.canHandle(task)) {
      throw new Error(
        `Handler found but action does not match expected format: ${taskType}`,
      );
    }

    await handler.execute(params);
  }
}
