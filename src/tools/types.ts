export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, object>;
    required: string[];
  };
}

export type ToolFn = (...args: any[]) => Promise<any>;

export interface ToolManager {
  tools: Record<string, ToolFn>;
  schemas: Record<string, object>;
  getSchemas: (names: string[]) => ToolSchema[];
}