export interface SkipCondition {
  eval(params: { [key: string]: any }): Promise<boolean>;
}
