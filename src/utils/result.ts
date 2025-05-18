import { AxleError } from "../errors/index.js";
import { Stats } from "../types.js";
import { WorkflowResult } from "../workflows/types.js";

export function isSuccessfulResult<T>(
  result: WorkflowResult<T>,
): result is WorkflowResult<T> & { success: true; error: undefined } {
  return result.success === true && result.error === undefined;
}

export function isErrorResult<T>(
  result: WorkflowResult<T>,
): result is WorkflowResult<T> & { success: false; error: AxleError } {
  return result.success === false && result.error !== undefined;
}

export function createResult<T>(response: T, stats?: Stats): WorkflowResult<T> {
  return { response, stats, success: true };
}

export function createErrorResult<T>(
  error: AxleError,
  partialResponse?: T,
  stats?: Stats,
): WorkflowResult<T> {
  return { response: partialResponse, stats, error, success: false };
}
