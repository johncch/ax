import { AbstractInstruct, DEFAULT_OUTPUT_VALUE } from "./AbstractInstruct.js";
import { ResTypes, ResTypeStrings } from "./types.js";

type DefaultResFormatType = { response: ResTypes.String };

export class Instruct<
  O extends Record<string, ResTypeStrings>,
> extends AbstractInstruct<O> {
  private constructor(prompt: string, resFormat: O) {
    super(prompt, resFormat);
  }

  public static with<NewO extends Record<string, ResTypeStrings>>(
    prompt: string,
    resFormat: NewO,
  ): Instruct<NewO>;
  public static with(prompt: string): Instruct<DefaultResFormatType>;
  public static with<NewO extends Record<string, ResTypeStrings>>(
    prompt: string,
    resFormat?: NewO,
  ): Instruct<NewO | DefaultResFormatType> {
    if (resFormat) {
      return new Instruct(prompt, resFormat);
    } else {
      return new Instruct(
        prompt,
        DEFAULT_OUTPUT_VALUE,
      ) as Instruct<DefaultResFormatType>;
    }
  }
}
