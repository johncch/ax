import { Recorder } from "../recorder/recorder.js";
import { AbstractInstruct, DEFAULT_OUTPUT_VALUE } from "./AbstractInstruct.js";
import { ResTypes, ResTypeStrings, StructuredOutput } from "./types.js";

type DefaultResFormatType = { response: ResTypes.String };

export class ChainOfThought<
  O extends Record<string, ResTypeStrings>,
> extends AbstractInstruct<O> {
  private constructor(prompt: string, resFormat: O) {
    super(prompt, resFormat);
  }

  public static with<NewO extends Record<string, ResTypeStrings>>(
    prompt: string,
    resFormat: NewO,
  ): ChainOfThought<NewO>;
  public static with(prompt: string): ChainOfThought<DefaultResFormatType>;
  public static with<NewO extends Record<string, ResTypeStrings>>(
    prompt: string,
    resFormat?: NewO,
  ): ChainOfThought<NewO | DefaultResFormatType> {
    if (resFormat) {
      return new ChainOfThought(prompt, resFormat);
    } else {
      return new ChainOfThought(
        prompt,
        DEFAULT_OUTPUT_VALUE,
      ) as ChainOfThought<DefaultResFormatType>;
    }
  }

  override compile(
    variables: Record<string, string>,
    runtime: {
      recorder?: Recorder;
      options?: { warnUnused?: boolean };
    } = {},
  ): string {
    const userPrompt = this.getFinalUserPrompt(variables, runtime);
    const instructionPrompt = this.getFormatInstructions();
    const chainOfThoughtPrompt =
      "\nLet's think step by step. Use <thinking></thinking> tags to show your reasoning and thought process.";

    return [userPrompt, chainOfThoughtPrompt, instructionPrompt].join("\n");
  }

  override finalize(rawValue: string): StructuredOutput<O> & { thinking } {
    const taggedSections = this.parseTaggedSections(rawValue);
    const results = super.finalize(rawValue, taggedSections) as Record<
      string,
      unknown
    >;
    if ("thinking" in taggedSections.tags) {
      results.thinking = taggedSections.tags.thinking;
    } else {
      throw new Error(
        "Expected results with tag <thinking> but it does not exist",
      );
    }
    return results as StructuredOutput<O> & { thinking: string };
  }
}
