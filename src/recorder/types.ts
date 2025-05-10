export type JsonObject = Record<string, unknown>;

export const TaskStatus = {
  Running: "running",
  Success: "success",
  Fail: "fail",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface RecorderTaskInput {
  type: "task";
  status: TaskStatus;
  id: string;
  message: string;
}

export interface RecorderLogInput {
  message: string;
  kind?: "heading" | "body";
}

export type RecorderInput = RecorderTaskInput | RecorderLogInput | JsonObject;

export type RecorderEntry = { level: LogLevel; time: number } & RecorderInput;

export enum LogLevel {
  Trace = 10,
  Debug = 20,
  Info = 30,
  Warn = 40,
  Error = 50,
  Fatal = 60,
}

// Writer interface for subscribers
export interface RecorderWriter {
  handleEvent(event: RecorderEntry): void;
}
