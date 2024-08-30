import { ProgramOptions } from "../index.js";
import { Display } from "../utils/display.js";
import {
  type FilePathInfo,
  replaceFilePattern,
  writeFileWithDirectories,
} from "../utils/file.js";
import { SaveVarAction, WriteToDiskAction } from "../utils/job.js";

export async function execWriteToDisk(params: {
  action: WriteToDiskAction;
  variables: Record<string, any>;
  options: ProgramOptions;
}) {
  const { action, variables, options } = params;
  if (options.dryRun) {
    Display.debug.log("Dry run: no action was taken");
    return;
  }
  const output = action.output;
  const content = variables.input;
  if (typeof content === "string") {
    const filepath = replaceFilePattern(output, variables.file as FilePathInfo);
    await writeFileWithDirectories(filepath, content);
  }
}

export function execSaveToVariables(params: {
  action: SaveVarAction;
  variables: Record<string, any>;
  options: ProgramOptions;
}) {
  const { action, variables, options } = params;
  if (options.dryRun) {
    Display.debug.log("Dry run: no action was taken");
    return;
  }
  const content = variables.input;
  if (typeof content === "string") {
    variables[action.name] = content;
  }
}
