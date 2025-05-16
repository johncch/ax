import { ChatTaskHandler } from "../tasks/chat/taskHandler.js";
import { TaskRegistry } from "./taskRegistry.js";

/**
 * Creates a base registry with handlers that work in all environments
 */
export function createBaseRegistry(): TaskRegistry {
  const registry = new TaskRegistry();

  // Register common handlers that work in all environments
  registry.register(new ChatTaskHandler());
  // Additional common handlers would be registered here

  return registry;
}
