import { Chat } from "../../ai/chat.js";
import {
  AIProvider,
  AIProviderStopReason,
  ChatItemAssistant,
  ToolCall,
} from "../../ai/types.js";
import { Instruct } from "../../core/Instruct.js";
import { Recorder } from "../../recorder/recorder.js";
import { TaskHandler } from "../../registry/taskHandler.js";
import { ToolExecutable, ToolSchema } from "../../tools/types.js";
import { ProgramOptions, Stats } from "../../types.js";
import { Keys } from "../../utils/variables.constants.js";

export class ChatTaskHandler implements TaskHandler<Instruct> {
  readonly taskType = "instruct";

  canHandle(task: any): task is Instruct {
    return (
      task &&
      typeof task === "object" &&
      "type" in task &&
      task.type === "instruct"
    );
  }

  async execute(params: {
    task: Instruct;
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

export async function executeChatAction(params: {
  instruct: Instruct;
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
  chat.addUser(instruct.compile(variables, { recorder, options }));
  if (instruct.hasTools()) {
    const toolSchemas = getToolSchemas(instruct.tools);
    chat.setToolSchemas(toolSchemas);
  }

  // Execute
  if (options?.dryRun) {
    recorder?.debug?.log(chat);
    return { action: "complete" };
  }

  let continueProcessing = true;
  while (continueProcessing) {
    const request = provider.createChatCompletionRequest(chat);
    const response = await request.execute({ recorder });

    stats.in += response.usage.in;
    stats.out += response.usage.out;

    if (response.type === "error") {
      throw new Error(response.error.message);
    }

    if (response.type === "success") {
      switch (response.reason) {
        case AIProviderStopReason.Stop: {
          if (response.message.content) {
            chat.addAssistant(response.message.content);
            variables[Keys.Latest] = response.message.content;
          }
          continueProcessing = false;
          return { action: "continue" };
        }
        case AIProviderStopReason.Length: {
          throw new Error(
            "Incomplete model output due to `max_tokens` parameter or token limit",
          );
        }
        case AIProviderStopReason.FunctionCall: {
          let message = response.message as ChatItemAssistant;
          if (response.message) {
            chat.addAssistant(message.content, message.toolCalls);
            variables[Keys.Latest] = response.message.content;
          }

          if (message.toolCalls && message.toolCalls.length > 0) {
            const toolCallResult = await executeToolCalls(
              message.toolCalls,
              instruct,
            );
            recorder?.debug?.log(toolCallResult);
            const results = toolCallResult.map((r) => ({
              id: r.id,
              content: JSON.stringify(r.results),
            }));
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

async function executeToolCalls(toolCalls: ToolCall[], instruct: Instruct) {
  const promises = [];
  for (const call of toolCalls) {
    promises.push(
      new Promise((resolve, reject) => {
        const tool = instruct.tools[call.name];
        if (!tool) {
          reject(`Tool not found: ${call.name}`);
          return;
        }

        let args: Record<string, any> = {};
        try {
          const parsed = JSON.parse(call.arguments);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            args = parsed;
          }
        } catch {
          reject(
            `argument for tool ${call.name} is not valid: ${JSON.stringify(call.arguments)}`,
          );
        }

        tool
          .execute(args)
          .then((results) => resolve({ id: call.id, results }))
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
