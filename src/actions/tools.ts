import { ToolAction } from "../configs/types.js";
import { Recorder } from "../recorder/recorder.js";
import { ToolManager } from "../tools/types.js";
import { ProgramOptions } from "../types.js";

import { Keys } from "../utils/variables.constants.js";

export async function executeToolAction(params: {
  step: ToolAction;
  toolManager: ToolManager;
  variables: Record<string, any>;
  options: ProgramOptions;
  recorder?: Recorder;
}) {
  const { step, toolManager, variables, recorder } = params;

  const toolCalls = step.toolCalls;
  const promises = [];
  for (const call of toolCalls) {
    promises.push(
      new Promise((resolve, reject) => {
        const tool = toolManager.tools[call.name];
        if (!tool) {
          reject(`Tool not found: ${call.name}`);
          return;
        }
        tool(call.arguments)
          .then((results) => resolve({ id: call.id, results }))
          .catch(reject);
      }),
    );
  }

  const results = await Promise.all(promises);
  variables[Keys.Latest] = results;
  recorder?.debug?.log(results);
}
