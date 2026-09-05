import { AppError, type ErrorMetadata } from "./app-error";

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication is required.", metadata?: ErrorMetadata) {
    super("UNAUTHORIZED", message, metadata);
    this.name = "UnauthorizedError";
  }
}
