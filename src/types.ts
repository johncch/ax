export type ProgramOptions = {
  dryRun?: boolean;
  config?: string;
  job?: string;
  log?: boolean;
  debug?: boolean;
  args?: string[];
};

export interface Stats {
  in: number;
  out: number;
}
