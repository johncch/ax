import { access, appendFile, mkdir, writeFile } from "node:fs/promises";
import { LogLevel, RecorderEntry, RecorderWriter } from "./types.js";

const DIR = "./logs/";

export class LogWriter implements RecorderWriter {
  private time: string;
  private initialized = false;

  constructor() {
    this.time = new Date().toISOString();
  }

  get filename(): string {
    return `${DIR}${this.time}.log`;
  }

  /**
   * Initialize the log directory and file
   */
  async initialize(): Promise<void> {
    try {
      await access(DIR);
    } catch (err) {
      await mkdir(DIR);
    }
    await writeFile(this.filename, `AXLE: New run at ${this.time}\n`);
    this.initialized = true;
  }

  /**
   * Write a message to the log file
   */
  private async writeToLog(event: RecorderEntry): Promise<void> {
    const { time, level, message, ...rest } = event;

    if (!this.initialized) {
      await this.initialize();
    }

    const printables: string[] = [];
    if (message && typeof message === "string") {
      printables.push(message);
    }
    if (Object.keys(rest).length) {
      printables.push(JSON.stringify(rest));
    }
    const formattedMessage = `${LogLevel[level]} ${new Date(time).toISOString()} > ${printables.join(" >> ")}\n`;
    try {
      await appendFile(this.filename, formattedMessage);
    } catch (err) {
      console.error(`Failed to write to log file: ${err}`);
    }
  }

  /**
   * Handle recorder events
   */
  async handleEvent(event: RecorderEntry): Promise<void> {
    await this.writeToLog(event);
  }
}
