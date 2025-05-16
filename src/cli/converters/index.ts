import { chatConverter } from "./chat.js";
import { StepToClassRegistry } from "./converters.js";
import { writeToDiskConverter } from "./writeToDisk.js";

export const converters = new StepToClassRegistry();
converters.register("write-to-disk", writeToDiskConverter);
converters.register("chat", chatConverter);
