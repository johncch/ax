import { isChatAction, isToolRespondAction } from "../configs/job.js";
import { ChatAction, Replace, ToolRespondAction } from "../configs/types.js";
import { Chat } from "../providers/chat.js";
import {
  AIProvider,
  AIProviderStopReason,
  ChatItemAssistant,
} from "../providers/types.js";
import { ProgramOptions, Stats } from "../types.js";
import { Display } from "../utils/display.js";
import { fileReplacer, manyFilesReplacer } from "../utils/replace.js";

export async function executeChatAction(params: {
  step: ChatAction | ToolRespondAction;
  chat: Chat;
  provider: AIProvider;
  stats: Stats;
  variables: Record<string, any>;
  options: ProgramOptions;
}) {
  const { step, chat, provider, stats, variables, options } = params;
  if (isChatAction(step)) {
    let { content, system } = step;
    if (step.replace) {
      [content, system] = await handleReplace(
        step.replace,
        variables,
        step.content,
        step.system,
      );
    }

    if (system) {
      chat.addSystem(system);
    }
    chat.addUser(content);
  } else if (isToolRespondAction(step)) {
    let inputs = variables.input as { id: string; results: any }[];
    const results = inputs.map((r) => ({
      id: r.id,
      content: JSON.stringify(r.results),
    }));
    chat.addTools(results);
  }

  // Execute
  if (options.dryRun) {
    Display.debug.log(chat);
    return { action: "continue" };
  }

  const request = provider.createChatCompletionRequest(chat);
  const response = await request.execute();

  stats.in += response.usage.in;
  stats.out += response.usage.out;
  if (response.type === "success") {
    switch (response.reason) {
      case AIProviderStopReason.Stop: {
        if (response.message.content) {
          chat.addAssistant(response.message.content);
          variables.input = response.message.content;
        }
        return { action: "continue" };
      }
      case AIProviderStopReason.Length: {
        return {
          action: "error",
          error: new Error(
            "Incomplete model output due to `max_tokens` parameter or token limit",
          ),
        };
      }
      case AIProviderStopReason.FunctionCall: {
        let message = response.message as ChatItemAssistant;
        if (response.message.content) {
          chat.addAssistant(message.content, message.toolCalls);
          variables.input = response.message.content;
        }
        return {
          action: "toolCall",
          toolCalls: message.toolCalls,
        };
      }
    }
  }
  Display.debug.log(response);

  if (response.type === "error") {
    return {
      action: "error",
      error: new Error(response.error.message),
    };
  }
}

async function handleReplace(
  replace: Replace[],
  variables: Record<string, any>,
  content: string,
  system?: string,
) {
  for (const r of replace) {
    switch (r.source) {
      case "file":
        content = await fileReplacer(content, r);
        if (system) {
          system = await fileReplacer(system, r);
        }
        break;
      case "many-files":
        content = await manyFilesReplacer(content, r);
        if (system) {
          system = await manyFilesReplacer(system, r);
        }
        break;
      default:
        content = content.replace(r.pattern, variables[r.name]);
        if (system) {
          system = system.replace(r.pattern, variables[r.name]);
        }
    }
  }
  return [content, system];
}
