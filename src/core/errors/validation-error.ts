import { AppError, type ErrorMetadata } from "./app-error";

export class ValidationError extends AppError {
  constructor(message = "The provided data is invalid.", metadata?: ErrorMetadata) {
    super("VALIDATION_ERROR", message, metadata);
    this.name = "ValidationError";
  }
}
