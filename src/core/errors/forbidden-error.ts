import { AppError, type ErrorMetadata } from "./app-error";

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.", metadata?: ErrorMetadata) {
    super("FORBIDDEN", message, metadata);
    this.name = "ForbiddenError";
  }
}
