import { WriteToDiskTaskHandler } from "../tasks/writeToDisk/taskHandler.js";
import { createBaseRegistry } from "./registryFactory.js";
import { TaskRegistry } from "./taskRegistry.js";

/**
 * Creates a Node.js-specific registry that includes all handlers,
 * including Node.js-specific ones
 */
export function createNodeRegistry(): TaskRegistry {
  const registry = createBaseRegistry();

  // Register Node.js specific handlers
  registry.register(new WriteToDiskTaskHandler());
  // Additional Node-specific handlers would be registered here

  return registry;
}
