import { Task } from "../../types.js";
import { Run } from "../types.js";

export interface Planner {
  plan(tasks: Task[]): Promise<Run[]>;
}
