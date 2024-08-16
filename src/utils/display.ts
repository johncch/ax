import chalk from "chalk";
import { stringify } from "./utils.js";
import Spinnies from "spinnies";
import { writeFile, appendFile, access, mkdir } from "node:fs/promises";

const DIR = "./logs/";

class Writer {
  time: string;
  constructor(time: string) {
    this.time = time;
  }

  get filename() {
    return `${DIR}${this.time}.log`;
  }

  async setup() {
    try {
      await access(DIR);
    } catch (err) {
      await mkdir(DIR);
    }
    await writeFile(this.filename, `AXLE: New run at ${this.time}\n`);
  }

  async write(message: string) {
    message = `${new Date().toISOString()}> ${message}\n`;
    await appendFile(this.filename, message);
  }
}

class Logger {
  instanceId = new Date().toISOString();
  spinnies = new Spinnies({ color: "white", succeedColor: "white" });
  opts = {
    debug: false,
  };
  writer: Writer | null = null;

  async initWriter() {
    this.writer = new Writer(new Date().toISOString());
    await this.writer.setup();
  }

  setOptions(options: Partial<{ debug: boolean }>) {
    this.opts = {
      debug: options.debug ?? false,
    };
  }

  get progress() {
    return {
      add: (name: string, message: string) => {
        this.spinnies.add(name, { text: message });
        this.writer?.write(message);
      },
      update: (name: string, message: string) => {
        this.spinnies.update(name, { text: message });
        this.writer?.write(message);
      },
      succeed: (name: string, message: string) => {
        this.spinnies.succeed(name, { text: message });
        this.writer?.write(message);
      },
      fail: (name: string, message: string) => {
        this.spinnies.fail(name, { text: message });
        this.writer?.write(message);
      },
    };
  }

  get info() {
    return {
      group(obj: any) {
        const output = stringify(obj);
        console.log(`\n${chalk.blue("==>")} ${chalk.whiteBright.bold(output)}`);
        this.writer?.write(output);
      },
      log: (obj: any) => {
        const output = stringify(obj);
        console.log(stringify(obj));
        this.writer?.write(output);
      },
    };
  }

  get debug() {
    const opts = this.opts;
    return {
      group(obj: any) {
        const output = stringify(obj);
        if (opts.debug) {
          console.log(`\n${chalk.gray("==>")} Debug: ${output}`);
        }
        this.writer?.write(output);
      },
      log: (obj: any) => {
        const output = stringify(obj);
        if (opts.debug) {
          console.log(chalk.gray(output));
        }
        this.writer?.write(output);
      },
    };
  }
}

export const Display = new Logger();
