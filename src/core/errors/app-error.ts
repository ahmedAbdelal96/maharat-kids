export type ErrorMetadata = Record<string, unknown>;

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly metadata?: ErrorMetadata,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }

  /** Never serialize internal metadata such as database causes to clients. */
  toJSON() {
    return { name: this.name, code: this.code, message: this.message };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
