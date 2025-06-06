import { access, appendFile, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { LogLevel, RecorderEntry, RecorderWriter } from "./types.js";

const LOCAL_DIR = "./logs/";
const AXLE_LOG_DIR = "~/.axle/logs/";

export class LogWriter implements RecorderWriter {
  private time: string;
  private initialized = false;
  private logDir: string = LOCAL_DIR;
  private pendingWrites: Promise<void>[] = [];

  constructor() {
    this.time = new Date().toISOString();
  }

  get filename(): string {
    return `${this.logDir}${this.time}.log`;
  }

  /**
   * Initialize the log directory and file
   */
  async initialize(): Promise<void> {
    try {
      await access(LOCAL_DIR);
      this.logDir = LOCAL_DIR;
    } catch (err) {
      const axleDir = AXLE_LOG_DIR.replace("~", homedir());
      try {
        await access(axleDir);
        this.logDir = axleDir;
      } catch (axleErr) {
        await mkdir(axleDir, { recursive: true });
        this.logDir = axleDir;
      }
    }

    const initPromise = writeFile(
      this.filename,
      `AXLE: New run at ${this.time}\n`,
    );
    this.pendingWrites.push(initPromise);

    try {
      await initPromise;
      this.initialized = true;
    } finally {
      // Remove from pending operations whether successful or not
      const index = this.pendingWrites.indexOf(initPromise);
      if (index !== -1) {
        this.pendingWrites.splice(index, 1);
      }
    }
  }

  /**
   * Write a message to the log file
   */
  private async writeToLog(event: RecorderEntry): Promise<void> {
    const { time, level, payload } = event;

    if (!this.initialized) {
      await this.initialize();
    }

    const printables: string[] = payload.map((p) => {
      if (typeof p === "string") {
        return p;
      }
      return JSON.stringify(p);
    });
    const formattedMessage = `${LogLevel[level]} ${new Date(time).toISOString()} > ${printables.join(" >> ")}\n`;

    const writePromise = appendFile(this.filename, formattedMessage).catch(
      (err) => {
        // Can't use recorder here to avoid infinite loop when recorder fails
        // Use direct console as fallback when log file operations fail
        console.error(`Failed to write to log file: ${err}`);
      },
    );

    this.pendingWrites.push(writePromise);

    try {
      await writePromise;
    } finally {
      const index = this.pendingWrites.indexOf(writePromise);
      if (index !== -1) {
        this.pendingWrites.splice(index, 1);
      }
    }
  }

  /**
   * Handle recorder events
   */
  async handleEvent(event: RecorderEntry): Promise<void> {
    await this.writeToLog(event);
  }

  /**
   * Ensure all pending write operations are complete
   * Used during graceful shutdown to ensure logs are written
   */
  async flush(): Promise<void> {
    if (this.pendingWrites.length > 0) {
      await Promise.all(this.pendingWrites);
    }
  }
}
