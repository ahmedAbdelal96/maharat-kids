import "server-only";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";

import { logger } from "./logger";

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

export function createRequestId(): string {
  return randomUUID();
}

export function createErrorId(): string {
  return randomUUID();
}

export async function getRequestId(): Promise<string> {
  try {
    const value = (await headers()).get("x-request-id");
    return value && requestIdPattern.test(value) ? value : createRequestId();
  } catch {
    return createRequestId();
  }
}

export function logUnexpectedError(input: {
  event: string;
  error: unknown;
  requestId?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}): string {
  const errorId = createErrorId();
  logger.error(input.event, {
    requestId: input.requestId ?? createRequestId(),
    errorId,
    route: input.route,
    error: input.error,
    ...input.metadata,
  });
  return errorId;
}
