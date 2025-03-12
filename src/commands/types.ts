import { BatchJob } from "../configs/types.js";

export interface Run {
  job: BatchJob;
  variables: Record<string, any>;
}
