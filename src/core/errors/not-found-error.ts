import { AppError, type ErrorMetadata } from "./app-error";

export class NotFoundError extends AppError {
  constructor(resource: string, message = `${resource} does not exist`, metadata?: ErrorMetadata) {
    super(`${resource.toUpperCase()}_NOT_FOUND`, message, {
      resource,
      ...metadata,
    });
    this.name = "NotFoundError";
  }
}
