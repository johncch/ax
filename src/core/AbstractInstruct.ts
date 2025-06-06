import { Recorder } from "../recorder/recorder.js";
import { ToolExecutable } from "../tools/types.js";
import { Task } from "../types.js";
import { replaceVariables } from "../utils/replace.js";
import { FileInfo } from "../utils/file.js";
import {
  ResTypes,
  ResTypeStrings,
  StringToType,
  StructuredOutput,
} from "./types.js";

type DefaultResFormatType = { response: ResTypes.String };
export const DEFAULT_OUTPUT_VALUE: DefaultResFormatType = {
  response: ResTypes.String,
};

export abstract class AbstractInstruct<O extends Record<string, ResTypeStrings>>
  implements Task
{
  readonly type = "instruct";

  protected _result: StructuredOutput<O> | undefined = undefined;

  prompt: string;
  system: string | null = null;
  inputs: Record<string, string> = {};
  tools: Record<string, ToolExecutable> = {};
  files: FileInfo[] = [];

  resFormat: O;
  rawResponse: string;
  finalPrompt: string;

  protected constructor(prompt: string, resFormat: O) {
    this.prompt = prompt;
    this.resFormat = resFormat;
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

  addImage(file: FileInfo) {
    if (file.type !== 'image') {
      throw new Error(`Expected image file, got ${file.type}`);
    }
    this.files.push(file);
  }

  addFile(file: FileInfo) {
    this.files.push(file);
  }

  hasTools(): boolean {
    return Object.keys(this.tools).length > 0;
  }

  hasFiles(): boolean {
    return this.files.length > 0;
  }

  get result() {
    return this._result;
  }

  //# Prompt related functions

  compile(
    variables: Record<string, string>,
    runtime: {
      recorder?: Recorder;
      options?: { warnUnused?: boolean };
    } = {},
  ): string {
    const userPrompt = this.getFinalUserPrompt(variables, runtime);
    const instructionPrompt = this.getFormatInstructions();
    return userPrompt + "\n" + instructionPrompt;
  }

  protected getFinalUserPrompt(
    variables: Record<string, string>,
    runtime: {
      recorder?: Recorder;
      options?: { warnUnused?: boolean };
    } = {},
  ): string {
    const { recorder, options } = runtime;
    const allVars = { ...variables, ...this.inputs }; // local takes precedence
    let finalPrompt = replaceVariables(this.prompt, allVars);
    if (options?.warnUnused) {
      const unreplaced = finalPrompt.match(/\{\{(.*?)\}\}/g);
      if (unreplaced) {
        recorder?.error.log(
          `Warning unused variables ${unreplaced.join(", ")}`,
        );
        throw new Error(`Unused variables: ${unreplaced.join(", ")}`);
      }
    }
    return finalPrompt;
  }

  protected getFormatInstructions(): string {
    let prompt = "";
    for (const [key, value] of Object.entries(this.resFormat)) {
      const typeString = this.resFormat[key];
      switch (typeString) {
        case ResTypes.String:
          prompt += `\nUse <${key}></${key}> to indicate the answer for ${key}. The answer must be a string.`;
          break;
        case ResTypes.Number:
          prompt += `\nUse <${key}></${key}> to indicate the answer for ${key}. the answer must be a number.`;
          break;
        case ResTypes.Boolean:
          prompt += `\nUse <${key}></${key}> to indicate the answer for ${key}. The answer must be a true/false.`;
          break;
        case ResTypes.List:
          prompt += `\nUse <${key}></${key}> to indicate the answer for ${key}. The answer must be a list of strings. Each string should be in a new line.`;
          break;
      }
    }
    return prompt;
  }

  //# Final answer parsing

  /**
   *
   * @param rawValue - the raw value from the AI
   * @param taggedSections - optional, for overrides to use
   * @returns - the parsed result
   */
  finalize(
    rawValue: string,
    taggedSections?: { tags: Record<string, string>; remaining: string },
  ): StructuredOutput<O> {
    this.rawResponse = rawValue;
    const result: any = {};
    const keys = Object.keys(this.resFormat) as Array<keyof O>;

    if (keys.length === 0) {
      if (rawValue.trim() === "{}" || rawValue.trim() === "") {
        return {} as StructuredOutput<O>;
      }
      throw new Error(
        "Output format is empty, but rawValue is not an empty object representation or empty string.",
      );
    }

    taggedSections = taggedSections || this.parseTaggedSections(rawValue);

    for (const key of keys) {
      const k = key as string;
      let value: string;
      const tagContent = taggedSections.tags[k];

      if (tagContent) {
        value = tagContent;
      } else {
        throw new Error(`Expected results with tag ${k} but it does not exist`);
      }

      const typeString = this.resFormat[key];
      try {
        const processedValue = this.typeResponses(typeString, value);
        result[key] = processedValue;
      } catch (e) {
        throw new Error(
          `Cannot convert value of key ${k} to ${typeString}: ${e.message}`,
        );
      }
    }

    this._result = result;
    return result as StructuredOutput<O>;
  }

  protected parseTaggedSections(input: string): {
    tags: Record<string, string>;
    remaining: string;
  } {
    const tagRegex = /<(\w+)>(.*?)<\/\1>/gs;
    const tags: Record<string, string> = {};
    let remaining = input;

    remaining = remaining.replace(tagRegex, (_match, tag, content) => {
      tags[tag] = content;
      return "";
    });

    return {
      tags,
      remaining: remaining.trim(),
    };
  }

  protected typeResponses(
    typeString: ResTypeStrings,
    rawValue: string,
  ): StringToType<ResTypes> {
    let processedValue: StringToType<ResTypes>;
    switch (typeString) {
      case ResTypes.String:
        processedValue = rawValue;
        break;
      case ResTypes.Number:
        processedValue = parseFloat(rawValue);
        if (isNaN(processedValue)) {
          throw new Error(
            `Cannot parse '${rawValue}' as number. Expected a numeric string.`,
          );
        }
        break;
      case ResTypes.Boolean:
        const lowerRawValue = rawValue.toLowerCase();
        if (lowerRawValue === "true") {
          processedValue = true;
        } else if (lowerRawValue === "false") {
          processedValue = false;
        } else {
          throw new Error(
            `Cannot parse '${rawValue}' as boolean. Expected 'true' or 'false'.`,
          );
        }
        break;
      case ResTypes.List: // "string[]"
        if (rawValue === "") {
          processedValue = [];
        } else {
          // TODO: implement more robust parsing for lists
          processedValue = rawValue
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }
        break;
    }
    return processedValue;
  }
}
