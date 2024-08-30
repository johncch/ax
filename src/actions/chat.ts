import { ProgramOptions } from "../index.js";
import { AIProvider, AIProviderStopReason, Chat } from "../providers/types.js";
import { Display } from "../utils/display.js";
import { ChatAction, Replace } from "../utils/job.js";
import { fileReplacer, manyFilesReplacer } from "../utils/replace.js";
import { Stats } from "../utils/stats.js";

export async function executeChatAction(params: {
  step: ChatAction;
  chat: Chat;
  provider: AIProvider;
  stats: Stats;
  variables: Record<string, any>;
  options: ProgramOptions;
}) {
  const { step, chat, provider, stats, variables, options } = params;
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

  // Execute
  if (options.dryRun) {
    Display.debug.log(chat);
    return { action: "continue" };
  }

  const request = provider.createChatCompletionRequest(chat);
  const response = await request.execute();

  stats.in += response.usage.in;
  stats.out += response.usage.out;
  if (response.type == "success") {
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
            "AXIS: Incomplete model output due to `max_tokens` parameter or token limit",
          ),
        };
      }
      case AIProviderStopReason.FunctionCall: {
        return {
          action: "error",
          error: new Error("Function call is currently not supported"),
        };
      }
    }
  }
  return {
    action: "error",
    error: new Error("Failed to get response from AI provider"),
  };
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
