import { Chat } from "../../ai/chat.js";
import {
  AIProvider,
  ChatItemAssistant,
  ChatItemToolCallResult,
  StopReason,
  ToolCall,
} from "../../ai/types.js";
import { Instruct } from "../../core/Instruct.js";
import { ResTypeStrings } from "../../core/types.js";
import { Recorder } from "../../recorder/recorder.js";
import { TaskHandler } from "../../registry/taskHandler.js";
import { ToolExecutable, ToolSchema } from "../../tools/types.js";
import { ProgramOptions, Stats } from "../../types.js";
import { Keys, setResultsIntoVariables } from "../../utils/variables.js";

export class ChatTaskHandler<O extends Record<string, ResTypeStrings>>
  implements TaskHandler<Instruct<O>>
{
  readonly taskType = "instruct";

  canHandle(task: any): task is Instruct<O> {
    return (
      task &&
      typeof task === "object" &&
      "type" in task &&
      task.type === "instruct"
    );
  }

  async execute(params: {
    task: Instruct<O>;
    chat: Chat;
    provider: AIProvider;
    variables: Record<string, any>;
    options?: ProgramOptions;
    stats?: Stats;
    recorder?: Recorder;
  }): Promise<void> {
    const { task, ...rest } = params;
    await executeChatAction({
      instruct: task,
      ...rest,
    });
  }
}

export async function executeChatAction<
  O extends Record<string, ResTypeStrings>,
>(params: {
  instruct: Instruct<O>;
  chat: Chat;
  provider: AIProvider;
  stats?: Stats;
  variables: Record<string, any>;
  options?: ProgramOptions;
  recorder?: Recorder;
}) {
  const { instruct, chat, provider, stats, variables, options, recorder } =
    params;

  if (instruct.system) {
    chat.addSystem(instruct.system);
  }
  const compiledPrompt = instruct.compile(variables, { recorder, options });
  if (instruct.hasFiles()) {
    chat.addUserWithFiles(compiledPrompt, instruct.files);
  } else {
    chat.addUser(compiledPrompt);
  }
  if (instruct.hasTools()) {
    const toolSchemas = getToolSchemas(instruct.tools);
    chat.setToolSchemas(toolSchemas);
  }

  if (options?.dryRun) {
    recorder?.debug?.log(chat);
    return { action: "complete" };
  }

  let continueProcessing = true;
  while (continueProcessing) {
    const request = provider.createChatRequest(chat, { recorder });
    const response = await request.execute({ recorder });

    stats.in += response.usage.in;
    stats.out += response.usage.out;

    if (response.type === "error") {
      throw new Error(JSON.stringify(response.error));
    }

    if (response.type === "success") {
      switch (response.reason) {
        case StopReason.Stop: {
          if (response.message.content) {
            const content = response.message.content;
            chat.addAssistant(content);
            const result = instruct.finalize(content);
            setResultsIntoVariables(result, variables, { options, recorder });
            variables[Keys.LastResult] = result;
          }
          continueProcessing = false;
          return { action: "continue" };
        }
        case StopReason.Length: {
          throw new Error(
            "Incomplete model output due to `max_tokens` parameter or token limit",
          );
        }
        case StopReason.FunctionCall: {
          let message = response.message as ChatItemAssistant;
          if (response.message) {
            chat.addAssistant(message.content, message.toolCalls);
          }

          if (message.toolCalls && message.toolCalls.length > 0) {
            const results = await executeToolCalls(
              message.toolCalls,
              instruct,
              { recorder },
            );
            recorder?.debug?.log(results);
            chat.addTools(results);

            continueProcessing = true;
          } else {
            continueProcessing = false;
          }
          break;
        }
      }
    }

    if (response.type !== "success") {
      recorder?.debug?.log(response);
      throw new Error("Unexpected response type");
    }
  }

  return { action: "continue" };
}

async function executeToolCalls<O extends Record<string, ResTypeStrings>>(
  toolCalls: ToolCall[],
  instruct: Instruct<O>,
  runtime: { recorder?: Recorder } = {},
): Promise<ChatItemToolCallResult[]> {
  const { recorder } = runtime;
  const promises = [];
  for (const call of toolCalls) {
    promises.push(
      new Promise((resolve, reject) => {
        const tool = instruct.tools[call.name];
        if (!tool) {
          reject(`Tool not found: ${call.name}`);
          return;
        }
        recorder?.debug?.heading.log(`Executing tool ${tool.name}`);

        let args: Record<string, any> = {};
        try {
          args =
            typeof call.arguments === "string"
              ? JSON.parse(call.arguments)
              : call.arguments;
        } catch {
          reject(
            `argument for tool ${call.name} is not valid: ${JSON.stringify(call.arguments)}`,
          );
        }

        tool
          .execute(args)
          .then((results) => {
            recorder?.debug?.log(`Complete tool ${tool.name}: ${call.id}`);
            resolve({
              id: call.id,
              name: call.name,
              content: JSON.stringify(results),
            });
          })
          .catch(reject);
      }),
    );
  }

  return Promise.all(promises);
}

function getToolSchemas(tools: Record<string, ToolExecutable>) {
  const toolSchemas: ToolSchema[] = [];
  for (const [name, tool] of Object.entries(tools)) {
    toolSchemas.push(tool.schema);
  }
  return toolSchemas;
}
