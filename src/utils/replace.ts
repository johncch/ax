import { glob } from "glob";
import { ReplaceFile, ReplaceManyFiles } from "./job.js";
import { arrayify } from "./utils.js";
import { Display } from "./display.js";
import { readFile } from "node:fs/promises";

export async function fileReplacer(
  content: string,
  r: ReplaceFile,
): Promise<string> {
  try {
    const replacement = await readFile(r.name, "utf-8");
    content = content.replace(r.pattern, replacement);
  } catch (error) {
    console.error(error);
  }
  return content;
}

export async function manyFilesReplacer(
  content: string,
  r: ReplaceManyFiles,
): Promise<string> {
  try {
    const names = arrayify(r.name);
    let replacement = "";
    for (const name of names) {
      const files = await glob(name);
      Display.debug.log(
        `many-files parser. For glob "${name}", found ${files.length} files.`,
      );
      const replacements = await Promise.all(
        files.map(async (name) => {
          const c = await readFile(name, "utf-8");
          return name + ":\n" + c;
        }),
      );
      replacement += replacements.join("\n");
    }
    content = content.replace(r.pattern, replacement);
  } catch (error) {
    console.error(error);
  }
  return content;
}
