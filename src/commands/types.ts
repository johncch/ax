import { BatchJob } from "../configs/types.js";
import { Stats } from "../types.js";

export interface Run {
  job: BatchJob;
  variables: Record<string, any>;
}

export interface SerializedExecutionResponse {
  response: string;
  stats: Stats;
}
