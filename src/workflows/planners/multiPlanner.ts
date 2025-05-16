import { Task } from "../../types.js";
import { Run } from "../types.js";
import { Planner } from "./types.js";

export class MultiPlanner implements Planner {
  planners: Planner[];
  constructor(planners: Planner[]) {
    this.planners = planners;
  }

  async plan(tasks: Task[]): Promise<Run[]> {
    const promises = this.planners.map(async (p) => {
      return await p.plan(tasks);
    });
    const allRuns = await Promise.all(promises);
    return allRuns.flat();
  }
}
