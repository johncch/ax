import { WriteToDiskTask } from "../../tasks/writeToDisk/task.js";
import { WriteToDiskStep } from "../configs/types.js";
import { StepToClassConverter } from "./converters.js";

export const writeToDiskConverter: StepToClassConverter<
  WriteToDiskStep,
  WriteToDiskTask
> = {
  async convert(step: WriteToDiskStep): Promise<WriteToDiskTask> {
    return {
      type: "write-to-disk",
      output: step.output,
    };
  },
};
