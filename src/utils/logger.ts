import chalk from "chalk";

class Logger {
  opts = {
    verbose: false,
    debug: false,
  };

  setOptions(options: Partial<{ verbose: boolean; debug: boolean }>) {
    this.opts = {
      verbose: options.verbose ?? false,
      debug: options.debug ?? false,
    };
  }

  get info() {
    return {
      log(obj: any) {
        if (typeof obj != "string") {
          obj = JSON.stringify(obj, null, 2);
        }
        console.log(`\n${chalk.blue("==>")} ${chalk.whiteBright.bold(obj)}`);
      },
    };
  }

  get verbose() {
    if (this.opts.verbose) {
      return {
        log(obj: any) {
          if (typeof obj != "string") {
            obj = JSON.stringify(obj, null, 2);
          }
          console.log(`\n${chalk.gray("==>")} Verbose: ${obj}`);
        },
      };
    }
  }

  get debug() {
    if (this.opts.debug) {
      return {
        log(obj: any) {
          if (typeof obj != "string") {
            obj = JSON.stringify(obj, null, 2);
          }
          console.log(`\n${chalk.gray("==>")} Debug: ${obj}`);
        },
      };
    }
  }
}

export const log = new Logger();
