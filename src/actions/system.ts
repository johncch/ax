import { SaveVarAction, WriteToDiskAction } from "../configs/types.js";
import { ProgramOptions } from "../types.js";
import { Display } from "../utils/display.js";
import { replaceFilePattern, writeFileWithDirectories } from "../utils/file.js";
import { replaceVariables } from "../utils/replace.js";
import { FilePathInfo } from "../utils/types.js";

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
    let filepath = "";
    if (output.includes("*")) {
      filepath = replaceFilePattern(output, variables.file as FilePathInfo);
    } else {
      filepath = replaceVariables(output, variables);
    }
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
