import { PlainObject } from "../types.js";

export interface RecorderLevelFunctions {
  log: (...message: (string | unknown | Error)[]) => void;
  heading: {
    log: (...message: (string | unknown | Error)[]) => void;
  };
}

export const TaskStatus = {
  Running: "running",
  Success: "success",
  PartialSuccess: "partialSuccess",
  Fail: "fail",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface RecorderTaskInput {
  type: "task";
  status: TaskStatus;
  id: string;
  message: string;
}

export type RecorderEntry = {
  level: LogLevel;
  time: number;
  kind: VisualLevel;
  payload: PlainObject[];
};

export type VisualLevel = "heading" | "body";

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
  handleEvent(event: RecorderEntry): void | Promise<void>;
  flush?(): Promise<void>;
}
