import chalk from "chalk";
import readline from "node:readline";
import {
  LogLevel,
  RecorderEntry,
  RecorderInput,
  RecorderTaskInput,
  RecorderWriter,
  TaskStatus,
} from "./types.js";

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const icons = {
  success: "✓",
  fail: "✗",
  spinning: spinnerFrames,
};

interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  frameIndex: number;
}

export class ConsoleWriter implements RecorderWriter {
  private tasks: Map<string, Task> = new Map();
  private entries: RecorderEntry[] = [];

  private truncate = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private spinnerInterval = 80; // ms
  private lastRender = "";
  private isRendering = false;

  constructor(options: { truncate?: number }) {
    this.truncate = options.truncate ?? 0;
  }

  private startSpinner(): void {
    if (this.intervalId !== null) return;

    this.intervalId = setInterval(() => {
      if (this.tasks.size > 0) {
        this.renderTasks();
      }
    }, this.spinnerInterval);
  }

  private stopSpinner(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private renderTasks(): void {
    if (this.isRendering) return;
    this.isRendering = true;

    // Clear previous render
    if (this.lastRender) {
      const lines = this.lastRender.split("\n").length;
      readline.moveCursor(process.stdout, 0, -lines + 1);
      readline.clearScreenDown(process.stdout);
    }

    // Once tasks are completed, we do one "final print" and then
    // we remove them from the running, updated list.
    const completedTasks = [...this.tasks.values()].filter(
      (task) =>
        task.status === TaskStatus.Success || task.status === TaskStatus.Fail,
    );
    for (const tasks of completedTasks) {
      const { id, text, status } = tasks;
      if (status === TaskStatus.Success) {
        console.log(chalk.green(icons.success), text);
      } else if (status === TaskStatus.Fail) {
        console.log(chalk.red(icons.fail), text);
      }
      this.tasks.delete(id);
    }

    // Render entries
    for (const entry of this.entries) {
      if (!isTask(entry)) {
        const { level, time, kind, message: msg = "", ...data } = entry;
        const message = msg as string;
        if (kind === "heading") {
          heading(level, message, data, { truncate: this.truncate });
        } else {
          body(level, message, data, { truncate: this.truncate });
        }
      }
    }
    this.entries = [];

    // Prepare new render
    let output = "";
    for (const task of this.tasks.values()) {
      const icon = chalk.cyan(icons.spinning[task.frameIndex]);
      task.frameIndex = (task.frameIndex + 1) % icons.spinning.length;
      output += `${icon} ${task.text}\n`;
    }

    this.lastRender = output;
    process.stdout.write(output);

    this.isRendering = false;
  }

  handleEvent(event: RecorderEntry): void {
    if (isTask(event)) {
      const { id, message, status } = event;
      if (status === TaskStatus.Running) {
        this.tasks.set(id, {
          id,
          text: message,
          status,
          frameIndex: 0,
        });
      } else if (status === TaskStatus.Success || status === TaskStatus.Fail) {
        if (this.tasks.has(id)) {
          const task = this.tasks.get(id)!;
          task.status = status;
          task.text = message;
        }
      }
    } else {
      this.entries.push(event);
    }

    // Check if any task has a spinner status and start the spinner if needed
    this.renderTasks();
    const hasSpinningTask = [...this.tasks.values()].some(
      (task) => task.status === TaskStatus.Running,
    );
    if (hasSpinningTask && this.intervalId === null) {
      this.startSpinner();
    } else if (!hasSpinningTask && this.intervalId !== null) {
      this.stopSpinner();
    }
  }

  destroy(): void {
    this.stopSpinner();
  }
}

function isTask(value: RecorderInput): value is RecorderTaskInput {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as RecorderTaskInput).type === "task"
  );
}

function heading(
  level: LogLevel,
  message: string,
  data: Record<string, any>,
  options: { truncate: number },
) {
  const l = level >= LogLevel.Info ? chalk.blue : chalk.gray;
  const b = level >= LogLevel.Info ? chalk.whiteBright.bold : chalk.white;
  console.log(`${l("==>")} ${b(message)}`);
  values(level, data, options);
}

function body(
  level: LogLevel,
  message: string,
  data: Record<string, any>,
  options: { truncate: number },
) {
  const b = level >= LogLevel.Info ? chalk.white : chalk.gray;
  if (message) console.log(b(message));
  values(level, data, options);
}

function values(
  level: LogLevel,
  data: Record<string, any>,
  options: { truncate: number },
) {
  const b = level >= LogLevel.Info ? chalk.white : chalk.gray;
  for (const [key, value] of Object.entries(data)) {
    const v =
      options.truncate > 0
        ? JSON.stringify(value, (key, value) => {
            if (typeof value === "string" && value.length > options.truncate) {
              return value.slice(0, options.truncate) + "<...>";
            }
            return value;
          })
        : JSON.stringify(value);
    console.log(b(`\t${key}: ${v}`));
  }
}
