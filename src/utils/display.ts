import chalk from "chalk";
import { stringify } from "./utils.js";
import Spinnies from "spinnies";

class Logger {
  spinnies = new Spinnies({ color: "white", succeedColor: "white" });
  opts = {
    debug: false,
  };

  setOptions(options: Partial<{ debug: boolean }>) {
    this.opts = {
      debug: options.debug ?? false,
    };
  }

  get progress() {
    return {
      add: (name: string, message: string) => {
        this.spinnies.add(name, { text: message });
      },
      update: (name: string, message: string) => {
        this.spinnies.update(name, { text: message });
      },
      succeed: (name: string, message: string) => {
        this.spinnies.succeed(name, { text: message });
      },
      fail: (name: string, message: string) => {
        this.spinnies.fail(name, { text: message });
      },
    };
  }

  get info() {
    return {
      group(obj: any) {
        console.log(
          `\n${chalk.blue("==>")} ${chalk.whiteBright.bold(stringify(obj))}`,
        );
      },
      log: (obj: any) => console.log(stringify(obj)),
    };
  }

  get debug() {
    if (this.opts.debug) {
      return {
        group(obj: any) {
          console.log(`\n${chalk.gray("==>")} Debug: ${stringify(obj)}`);
        },
        log: (obj: any) => console.log(chalk.gray(stringify(obj))),
      };
    }
  }
}

export const Display = new Logger();
