import { Recorder } from "../recorder/recorder.js";
import { ToolExecutable } from "../tools/types.js";
import { Task } from "../types.js";
import { replaceVariables } from "../utils/replace.js";
import {
  ResTypes,
  ResTypeStrings,
  StringToType,
  StructuredOutput,
} from "./types.js";

type DefaultresFormatType = { response: ResTypes.String };
const DEFAULT_OUTPUT_VALUE: DefaultresFormatType = {
  response: ResTypes.String,
};

export class Instruct<O extends Record<string, ResTypeStrings>>
  implements Task
{
  readonly type = "instruct";

  private _result: StructuredOutput<O> | undefined = undefined;

  prompt: string;
  system: string | null = null;

  inputs: Record<string, string> = {};
  tools: Record<string, ToolExecutable> = {};

  resFormat: O;
  rawResponse: string;

  private constructor(prompt: string, resFormat: O) {
    this.prompt = prompt;
    this.resFormat = resFormat;
  }

  public static with<NewO extends Record<string, ResTypeStrings>>(
    prompt: string,
    resFormat: NewO,
  ): Instruct<NewO>;
  public static with(prompt: string): Instruct<DefaultresFormatType>;
  public static with<NewO extends Record<string, ResTypeStrings>>(
    prompt: string,
    resFormat?: NewO,
  ): Instruct<NewO | DefaultresFormatType> {
    if (resFormat) {
      return new Instruct(prompt, resFormat);
    } else {
      return new Instruct(
        prompt,
        DEFAULT_OUTPUT_VALUE,
      ) as Instruct<DefaultresFormatType>;
    }
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

  get result() {
    return this._result;
  }

  compile(
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

    finalPrompt += `\nThe answer must be enclosed in the following XML tags: ${Object.keys(this.resFormat).join(", ")}`;

    return finalPrompt;
  }

  finalize(rawValue: string): StructuredOutput<O> {
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

    const taggedSections = parseTaggedSections(rawValue);
    for (const key of keys) {
      const k = key as string;
      let value: string;
      const tagContent = taggedSections.tags[k];

      if (tagContent) {
        value = tagContent;
      } else {
        if (keys.length === 1) {
          value = taggedSections.remaining;
        } else {
          throw new Error(
            `Expected results with tag ${k} but it does not exist`,
          );
        }
      }

      const typeString = this.resFormat[key];
      try {
        const processedValue = typeResponses(typeString, value);
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
}

function parseTaggedSections(input: string): {
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

function typeResponses(
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
        processedValue = rawValue.split(",").map((s) => s.trim());
      }
      break;
  }
  return processedValue;
}
