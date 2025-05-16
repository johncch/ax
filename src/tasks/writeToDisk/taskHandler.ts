import { Recorder } from "../../recorder/recorder.js";
import { TaskHandler } from "../../registry/taskHandler.js";
import { ProgramOptions } from "../../types.js";
import {
  replaceFilePattern,
  writeFileWithDirectories,
} from "../../utils/file.js";
import { replaceVariables } from "../../utils/replace.js";
import { FilePathInfo } from "../../utils/types.js";
import { Keys } from "../../utils/variables.constants.js";
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

    if (options.dryRun) {
      recorder?.debug?.log("Dry run: no action was taken");
      return;
    }
    const output = task.output;
    const content = variables[Keys.Latest];
    if (typeof content === "string") {
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
}
