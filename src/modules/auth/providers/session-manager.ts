import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { AppError, UnauthorizedError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { SessionManager as IdentitySessionManager } from "@/modules/identity/domain/services";
import type { CreateSessionInput, Session } from "@/modules/identity/types";

import { SESSION_COOKIE_NAME } from "../constants";
import type { AuthRepository } from "../infrastructure/repository";

export type SessionManager = IdentitySessionManager;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class CookieSessionManager implements SessionManager {
  constructor(private readonly repository: AuthRepository) {}

  async create(input: CreateSessionInput): Promise<Result<Session, AppError>> {
    try {
      const token = randomBytes(32).toString("base64url");
      const session = await this.repository.createSession({
        userId: input.userId,
        tokenHash: hashToken(token),
        expiresAt: input.expiresAt,
      });
      const cookieStore = await cookies();

      cookieStore.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        expires: input.expiresAt,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      return success(session);
    } catch (error) {
      return failure(new AppError("SESSION_CREATE_FAILED", "Session creation failed.", { cause: error }));
    }
  }

  async getCurrent(): Promise<Result<Session | null, AppError>> {
    try {
      const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

      if (!token) {
        return success(null);
      }

      return success(await this.repository.findSessionByTokenHash(hashToken(token)));
    } catch (error) {
      return failure(new AppError("SESSION_LOOKUP_FAILED", "Session lookup failed.", { cause: error }));
    }
  }

  async revoke(sessionId: string): Promise<Result<true, AppError>> {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

      if (!token) {
        return failure(new UnauthorizedError());
      }

      const current = await this.repository.findSessionByTokenHash(hashToken(token));

      if (!current || current.id !== sessionId) {
        return failure(new UnauthorizedError());
      }

      await this.repository.deleteSession(sessionId);
      cookieStore.delete(SESSION_COOKIE_NAME);
      return success(true);
    } catch (error) {
      return failure(new AppError("SESSION_REVOKE_FAILED", "Session revocation failed.", { cause: error }));
    }
  }
}
