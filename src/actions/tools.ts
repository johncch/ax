import { ProgramOptions } from "../index.js";
import { ToolManager } from "../tools/index.js";
import { Display } from "../utils/display.js";
import { ToolAction } from "../utils/job.js";

export async function executeToolAction(params: {
  step: ToolAction;
  toolManager: ToolManager;
  variables: Record<string, any>;
  options: ProgramOptions;
}) {
  const { step, toolManager, variables } = params;

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
  variables.input = results;
  Display.debug.log(results);
}
