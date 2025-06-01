import { Recorder } from "../../recorder/recorder.js";
import { TaskHandler } from "../../registry/taskHandler.js";
import { ProgramOptions } from "../../types.js";
import {
  replaceFilePattern,
  writeFileWithDirectories,
} from "../../utils/file.js";
import { replaceVariables } from "../../utils/replace.js";
import { FilePathInfo } from "../../utils/types.js";
import { WriteToDiskTask } from "./task.js";

export class WriteToDiskTaskHandler implements TaskHandler<WriteToDiskTask> {
  readonly taskType = "write-to-disk";

  canHandle(task: any): task is WriteToDiskTask {
    return (
      task &&
      typeof task === "object" &&
      "type" in task &&
      task.type === "write-to-disk"
    );
  }

  async execute(params: {
    task: WriteToDiskTask;
    variables: Record<string, any>;
    options?: ProgramOptions;
    recorder?: Recorder;
  }): Promise<void> {
    const { task, variables, options = {}, recorder } = params;

    const output = task.output;

    const keys = task.keys ?? [];

    if (options?.warnUnused) {
      const unusedKeys = keys.filter((key) => !(key in variables));
      if (unusedKeys.length > 0) {
        recorder?.warn?.log(
          `[Write To Disk] The following keys were not found in the variables: ${unusedKeys.join(", ")}`,
        );
      }
    }

    let content = "";
    if (keys.length === 1) {
      content = variables[keys[0]] ?? "<not found>";
    } else {
      content = keys
        .map((key) => `[${key}]:\n${variables[key] ?? "<not found>"}\n`)
        .join("\n");
    }

    if (options?.dryRun) {
      recorder?.info?.log(`[Dry run] Write to Disk is not executed.`);
      return;
    }

    let filepath = "";
    if (output.includes("*")) {
      filepath = replaceFilePattern(output, variables.file as FilePathInfo);
    } else {
      filepath = replaceVariables(output, variables, "{}");
    }
    await writeFileWithDirectories({
      filePath: filepath,
      content,
    });
  }
}
