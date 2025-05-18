export class AxleError extends Error {
  public readonly code: string;
  public readonly id?: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    options?: {
      code?: string;
      id?: string;
      details?: Record<string, any>;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.code = options?.code || "AXLE_ERROR";
    this.id = options?.id;
    this.details = options?.details;

    Object.setPrototypeOf(this, AxleError.prototype);
  }
}
