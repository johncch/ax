import { readFile } from "fs/promises";
import { glob } from "glob";
import { Task } from "../../types.js";
import { pathToComponents } from "../../utils/file.js";
import { SkipCondition } from "../skipConditions/types.js";
import { Run } from "../types.js";
import { Planner } from "./types.js";

export class FileRunPlanner implements Planner {
  constructor(
    public source: string,
    public bind: string,
    public skipConditions: SkipCondition[],
  ) {}

  async plan(tasks: Task[]): Promise<Run[]> {
    const runs: Run[] = [];
    const files = await glob(this.source, { withFileTypes: true });

    for (const f of files) {
      const filePath = f.fullpath();
      const components = pathToComponents(filePath);
      let shouldSkip = false;
      for (const sc of this.skipConditions) {
        shouldSkip = await sc.eval({ components });
        if (shouldSkip) {
          break;
        }
      }

      if (!shouldSkip) {
        const content = await readFile(filePath, "utf-8");

        const run: Run = {
          variables: {
            [this.bind]: content,
            ...components,
          },
          tasks,
        };
        runs.push(run);
      }
    }

    return runs;
  }
}
