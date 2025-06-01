import { AIProvider } from "../ai/types.js";
import { AxleError } from "../errors/AxleError.js";
import { Recorder } from "../recorder/recorder.js";
import { ProgramOptions, Stats, Task } from "../types.js";
import { Planner } from "./planners/types.js";

export interface Run {
  tasks: Task[];
  variables: Record<string, any>;
}

export interface SerializedExecutionResponse {
  response: string;
  stats: Stats;
}

export interface ChatCommand {
  type: string;
}

export interface WorkflowResult<T = any> {
  response: T;
  stats?: Stats;
  error?: AxleError;
  success: boolean;
}

export interface WorkflowExecutable {
  execute: (context: {
    provider: AIProvider;
    variables: Record<string, any>;
    options?: ProgramOptions;
    stats?: Stats;
    recorder?: Recorder;
    name?: string;
  }) => Promise<WorkflowResult>;
}

/* DAG types */
export interface DAGNodeDefinition {
  task: Task | Task[];
  dependsOn?: string | string[];
}

export interface DAGConcurrentNodeDefinition {
  planner: Planner;
  tasks: Task[];
  dependsOn?: string | string[];
}

export interface DAGDefinition {
  [nodeName: string]:
    | Task
    | Task[]
    | DAGNodeDefinition
    | DAGConcurrentNodeDefinition;
}

export interface DAGNode {
  id: string;
  tasks: Task[];
  dependencies: string[];
  planner?: Planner;
  executionType: "serial" | "concurrent";
}

export interface DAGExecutionPlan {
  stages: string[][];
  nodes: Map<string, DAGNode>;
}

export interface DAGWorkflowOptions {
  continueOnError?: boolean;
  maxConcurrency?: number;
}
