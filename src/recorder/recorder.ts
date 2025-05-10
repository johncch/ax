import {
  LogLevel,
  RecorderEntry,
  RecorderInput,
  RecorderWriter,
} from "./types.js";

export class Recorder {
  instanceId = crypto.randomUUID();
  level: LogLevel = LogLevel.Info;

  private logs: RecorderEntry[] = [];

  /*
    Pub sub methods for writers
  */

  private writers: RecorderWriter[] = [];

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

  private logFunction(level: LogLevel, obj: string | RecorderInput) {
    const data = typeof obj === "string" ? { message: obj } : obj;
    this.publish({
      level,
      time: Date.now(),
      ...data,
    });
  }

  get info() {
    return {
      log: this.logFunction.bind(this, LogLevel.Info),
    };
  }

  get debug() {
    if (this.level > LogLevel.Debug) {
      return null;
    }
    return {
      log: this.logFunction.bind(this, LogLevel.Debug),
    };
  }

  /*
   Methods to get data in memory
  */
  getLogs(level: LogLevel = LogLevel.Info) {
    return this.logs.filter((entry) => entry.level >= level);
  }
}
