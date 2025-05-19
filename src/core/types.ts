export enum ResTypes {
  String = "string",
  List = "string[]",
  Number = "number",
  Boolean = "boolean",
}

export type ResTypeStrings = `${ResTypes}`;

export type StringToType<S extends ResTypeStrings> = S extends ResTypes.String
  ? string
  : S extends ResTypes.List
    ? string[]
    : S extends ResTypes.Number
      ? number
      : S extends ResTypes.Boolean
        ? boolean
        : never;

export type StructuredOutput<T extends Record<string, ResTypeStrings>> = {
  [K in keyof T]: StringToType<T[K]>;
};
