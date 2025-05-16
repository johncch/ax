import { ToolExecutable } from "../tools/types.js";
import { Task } from "../types.js";
import { replaceVariables } from "../utils/replace.js";

enum OutputTypes {
  String = "string",
  List = "string[]",
  Number = "number",
  Boolean = "boolean",
}

export class Instruct implements Task {
  readonly type = "instruct";
  prompt: string;
  system: string | null = null;
  inputs: Record<string, string>;
  outputFormat: Record<string, string>;
  tools: Record<string, ToolExecutable> = {};

  constructor(
    prompt: string,
    outputFormat: Record<string, string> = { response: OutputTypes.String },
  ) {
    this.prompt = prompt;
    this.outputFormat = outputFormat;
  }

  setInputs(inputs: Record<string, string>) {
    this.inputs = inputs;
  }

  addInput(name: string, value: string) {
    this.inputs[name] = value;
  }

  addTools(tools: ToolExecutable[]) {
    for (const tool of tools) {
      this.tools[tool.name] = tool;
    }
  }

  addTool(tool: ToolExecutable) {
    this.tools[tool.name] = tool;
  }

  hasTools(): boolean {
    return Object.keys(this.tools).length > 0;
  }

  compile(
    variables: Record<string, string>,
    options?: { warnUnused?: boolean },
  ): string {
    const allVars = { ...variables, ...this.inputs }; // local takes precedence
    let finalPrompt = replaceVariables(this.prompt, allVars);
    if (options?.warnUnused) {
      const unreplaced = finalPrompt.match(/\{\{(.*?)\}\}/g);
      if (unreplaced) {
        console.warn(
          `Warning: The following variables were not replaced: ${unreplaced.join(
            ", ",
          )}`,
        );
      }
    }
    // TODO // more prompt stuff
    return finalPrompt;
  }
}
