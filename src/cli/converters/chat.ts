import { Instruct } from "../../core/Instruct.js";
import { ResTypeStrings } from "../../core/types.js";
import { Recorder } from "../../recorder/recorder.js";
import { getToolRegistry } from "../../tools/index.js";
import { loadManyFiles } from "../../utils/file.js";
import { arrayify } from "../../utils/utils.js";
import { ChatStep } from "../configs/types.js";
import { StepToClassConverter } from "./converters.js";

export const chatConverter: StepToClassConverter<
  ChatStep,
  Instruct<Record<string, ResTypeStrings>>
> = {
  async convert(
    step: ChatStep,
    context: { recorder?: Recorder; toolNames?: string[] },
  ): Promise<Instruct<Record<string, ResTypeStrings>>> {
    const { recorder, toolNames } = context;
    const { message, system, replace } = step;

    const instruct = Instruct.with(message);
    if (system) {
      instruct.system = system;
    }

    const allToolNames = [
      ...new Set([...(toolNames ?? []), ...(step.tools ?? [])]),
    ];
    for (const toolName of allToolNames) {
      const tool = getToolRegistry().get(toolName);
      instruct.addTool(tool);
    }

    if (replace) {
      for (const r of replace) {
        if (r.source === "file") {
          const filenames = arrayify(r.files);
          const replacements = await loadManyFiles(filenames, recorder);
          instruct.addInput(r.pattern, replacements);
        }
      }
    }
    return instruct;
  },
};
