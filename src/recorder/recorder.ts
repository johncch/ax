import { serializeError } from "serialize-error";
import {
  LogLevel,
  RecorderEntry,
  RecorderLevelFunctions,
  RecorderWriter,
  VisualLevel,
} from "./types.js";

export class Recorder {
  instanceId = crypto.randomUUID();
  private currentLevel: LogLevel = LogLevel.Info;

  private logs: RecorderEntry[] = [];
  private writers: RecorderWriter[] = [];

  private _debug: RecorderLevelFunctions | null;
  private _info: RecorderLevelFunctions | null;
  private _warn: RecorderLevelFunctions | null;
  private _error: RecorderLevelFunctions;

  constructor() {
    this.buildMethods();
  }

  buildMethods() {
    this._debug =
      LogLevel.Debug >= this.currentLevel
        ? this.createLoggingFunction(LogLevel.Debug)
        : null;
    this._info =
      LogLevel.Info >= this.currentLevel
        ? this.createLoggingFunction(LogLevel.Info)
        : null;
    this._warn =
      LogLevel.Warn >= this.currentLevel
        ? this.createLoggingFunction(LogLevel.Warn)
        : null;
    this._error = this.createLoggingFunction(LogLevel.Error);
  }

  set level(level: LogLevel) {
    this.currentLevel = level;
    this.buildMethods();
  }

  get level() {
    return this.currentLevel;
  }

  get info() {
    return this._info;
  }
  get warn() {
    return this._warn;
  }
  get error() {
    return this._error;
  }
  get debug() {
    return this._debug;
  }

  /*
    Pub sub methods for writers
  */

  subscribe(writer: RecorderWriter): void {
    if (!this.writers.includes(writer)) {
      this.writers.push(writer);
    }
  }

  unsubscribe(writer: RecorderWriter): void {
    const index = this.writers.indexOf(writer);
    if (index !== -1) {
      this.writers.splice(index, 1);
    }
  }

  private publish(event: RecorderEntry): void {
    this.logs.push(event);

    for (const writer of this.writers) {
      writer.handleEvent(event);
    }
  }

  /*
   Log Methods
  */

  private logFunction(
    level: LogLevel,
    kind: VisualLevel,
    ...input: (string | Error | Record<string, unknown>)[]
  ) {
    let payload = input.map((item) => {
      if (typeof item === "string") {
        return { message: item };
      } else if (item instanceof Error) {
        return serializeError(item);
      } else {
        return item;
      }
    });

    this.publish({
      level,
      time: Date.now(),
      kind,
      payload,
    });
  }

  private createLoggingFunction(level: LogLevel) {
    return {
      log: this.logFunction.bind(this, level, "body"),
      heading: {
        log: this.logFunction.bind(this, level, "heading"),
      },
    };
  }

  /*
   Methods to get data in memory
  */
  getLogs(level: LogLevel = LogLevel.Info) {
    return this.logs.filter((entry) => entry.level >= level);
  }

  /**
   * Ensures all writers have completed their pending operations
   * Call this before exiting the process to ensure logs are written
   */
  async shutdown(): Promise<void> {
    for (const writer of this.writers) {
      if (typeof writer.flush === "function") {
        await writer.flush();
      }
    }
  }
}
