import chalk from "chalk";
import readline from "node:readline";
import { PlainObject } from "../types.js";
import {
  LogLevel,
  RecorderEntry,
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
  private inline = true;

  constructor(options: { truncate?: number; inline?: boolean } = {}) {
    this.truncate = options.truncate ?? 0;
    this.inline = options.inline ?? true;
  }

  private startSpinner(): void {
    if (this.intervalId !== null) return;

    this.intervalId = setInterval(() => {
      const hasRunningTasks = [...this.tasks.values()].some(
        (task) => task.status === TaskStatus.Running,
      );
      if (hasRunningTasks) {
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
    if (this.inline && this.lastRender) {
      const lines = this.lastRender.split("\n").length;
      readline.moveCursor(process.stdout, 0, -lines + 1);
      readline.clearScreenDown(process.stdout);
    }

    // Check if all tasks are completed
    const allTasks = [...this.tasks.values()];
    const runningTasks = allTasks.filter(
      (task) => task.status === TaskStatus.Running,
    );
    const completedTasks = allTasks.filter(
      (task) =>
        task.status === TaskStatus.Success || task.status === TaskStatus.Fail,
    );

    // If all tasks are completed, remove them from the map (they've been displayed in live output)
    if (runningTasks.length === 0 && completedTasks.length > 0) {
      let output = "";
      for (const task of completedTasks) {
        if (task.status === TaskStatus.Success) {
          const icon = chalk.green(icons.success);
          output += `${icon} ${task.text}\n`;
        } else if (task.status === TaskStatus.Fail) {
          const icon = chalk.red(icons.fail);
          output += `${icon} ${task.text}\n`;
        }
        this.tasks.delete(task.id);
      }
      console.log(output);
    }

    // Render entries
    for (const entry of this.entries) {
      const { level, time, kind, payload } = entry;
      if (kind === "heading") {
        heading(level, payload, { truncate: this.truncate });
      } else {
        body(level, payload, { truncate: this.truncate });
      }
    }
    this.entries = [];

    // Prepare new render - show all tasks with appropriate icons
    let output = "";
    for (const task of this.tasks.values()) {
      if (task.status === TaskStatus.Running) {
        const icon = chalk.cyan(icons.spinning[task.frameIndex]);
        task.frameIndex = (task.frameIndex + 1) % icons.spinning.length;
        output += `${icon} ${task.text}\n`;
      } else if (task.status === TaskStatus.Success) {
        const icon = chalk.green(icons.success);
        output += `${icon} ${task.text}\n`;
      } else if (task.status === TaskStatus.Fail) {
        const icon = chalk.red(icons.fail);
        output += `${icon} ${task.text}\n`;
      }
    }

    this.lastRender = output;
    process.stdout.write(output);

    this.isRendering = false;
  }

  handleEvent(event: RecorderEntry): void {
    const { level, time, payload } = event;
    if (payload.length > 0 && isTask(payload[0])) {
      const taskPayload = payload[0] as RecorderTaskInput;
      const { id, message, status } = taskPayload;
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
    const hasRunningTask = [...this.tasks.values()].some(
      (task) => task.status === TaskStatus.Running,
    );
    if (hasRunningTask && this.intervalId === null) {
      this.startSpinner();
    } else if (!hasRunningTask && this.intervalId !== null) {
      this.stopSpinner();
    }
  }

  destroy(): void {
    this.stopSpinner();
  }
}

function isTask(value: unknown): value is RecorderTaskInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.type !== "task") return false;
  if (typeof v.id !== "string" || typeof v.message !== "string") return false;

  switch (v.status) {
    case TaskStatus.Running:
    case TaskStatus.Success:
    case TaskStatus.PartialSuccess:
    case TaskStatus.Fail:
      return true;
    default:
      return false;
  }
}

function heading(
  level: LogLevel,
  payload: Record<string, any>[],
  options: { truncate: number },
) {
  let l, b;
  if (level === LogLevel.Error) {
    l = chalk.red;
    b = chalk.redBright.bold;
  } else if (level === LogLevel.Warn) {
    l = chalk.yellow;
    b = chalk.yellowBright.bold;
  } else if (level >= LogLevel.Info) {
    l = chalk.blue;
    b = chalk.whiteBright.bold;
  } else {
    l = chalk.gray;
    b = chalk.white;
  }
  const { message, data } = toMsgData(payload);
  console.log(`${l("==>")} ${b(message)}`);
  values(level, data, options);
}

function body(
  level: LogLevel,
  payload: Record<string, any>[],
  options: { truncate: number },
) {
  let b;
  if (level === LogLevel.Error) {
    b = chalk.red;
  } else if (level === LogLevel.Warn) {
    b = chalk.yellow;
  } else if (level >= LogLevel.Info) {
    b = chalk.white;
  } else {
    b = chalk.gray;
  }
  const { message, data } = toMsgData(payload);
  if (message) console.log(b(message));
  values(level, data, options);
}

const delimiter = "    ";

function values(
  level: LogLevel,
  data: PlainObject[],
  options: { truncate: number },
) {
  let b;
  if (level === LogLevel.Error) {
    b = chalk.red;
    options.truncate = 0;
  } else if (level == LogLevel.Warn) {
    b = chalk.yellow;
  } else if (level >= LogLevel.Info) {
    b = chalk.white;
  } else {
    b = chalk.gray;
  }
  data.forEach((d) => {
    if (typeof d === "string") {
      console.log(b(`${delimiter}${d}`));
      return;
    }
    for (const [key, value] of Object.entries(d)) {
      let v = JSON.stringify(value, truncator(options.truncate), "\t");
      const printable = `${key}: ${v}`
        .split("\n")
        .map((line) => delimiter + line)
        .join("\n");
      console.log(b(printable));
    }
  });
}

function toMsgData(arr: Record<string, unknown>[]): {
  message: string;
  data: Record<string, unknown>[];
} {
  const [first, ...rest] = arr;
  let message = "";
  let data = rest;

  if (first) {
    let { message: m, ...rest } = first;
    message = m && typeof m === "string" ? m : "";

    if (Object.keys(rest).length > 0) {
      data = [rest, ...data];
    }
  }
  return { message, data };
}

function truncator(truncate: number) {
  if (truncate === 0) {
    return null;
  }
  return (key, value) => {
    if (typeof value === "string" && value.length > truncate) {
      return value.slice(0, truncate) + "<...>";
    }
    return value;
  };
}
