import { createHash, timingSafeEqual, randomInt } from "node:crypto";

import { AppError, ForbiddenError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import { env } from "@/config/env";
import { normalizeEmail } from "@/modules/identity/domain/rules";

import {
  PASSWORD_RESET_CODE_TTL_MINUTES,
  PASSWORD_RESET_MAX_ATTEMPTS,
  PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
} from "../constants";
import type { ResetPasswordInput, RequestPasswordResetInput, VerifyPasswordResetCodeInput } from "../types";
import type { UserId } from "@/modules/identity/types";
import type { AuthRepository } from "../infrastructure/repository";
import type { PasswordResetRepository } from "../infrastructure/password-reset-repository";
import type { EmailService } from "../providers/email-service";
import {
  clearResetToken,
  createResetToken,
  getResetToken,
  setResetToken,
  verifyResetToken,
} from "../providers/reset-token";
import type { PasswordHasher } from "@/modules/identity/domain/services";

export const PASSWORD_RESET_NEUTRAL_MESSAGE =
  "If an account exists for this email, a verification code has been sent.";

function hashCode(code: string): string {
  return createHash("sha256").update(`${code}\u0000${env.AUTH_SECRET}`).digest("hex");
}

function codesMatch(expectedHash: string, code: string): boolean {
  const actualHash = hashCode(code);
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function operationError(operation: string, cause: unknown): AppError {
  return new AppError(
    "PASSWORD_RESET_OPERATION_FAILED",
    `Password reset operation failed: ${operation}.`,
    { cause },
  );
}

export class PasswordResetService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly resetRepository: PasswordResetRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly emailService: EmailService,
  ) {}

  async requestCode(input: RequestPasswordResetInput): Promise<Result<string, AppError>> {
    try {
      const email = normalizeEmail(input.email);
      const user = await this.authRepository.findUserByEmail(email);

      if (!user || user.type !== "CUSTOMER" || !user.passwordHash || user.passwordHash.startsWith("external-only$")) {
        return success(PASSWORD_RESET_NEUTRAL_MESSAGE);
      }

      const now = new Date();
      const latest = await this.resetRepository.findLatest(user.id);

      if (latest && now.getTime() - latest.createdAt.getTime() < PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * 1000) {
        return success(PASSWORD_RESET_NEUTRAL_MESSAGE);
      }

      await this.resetRepository.invalidateActive(user.id, now);

      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const expiresAt = new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000);
      await this.resetRepository.create({ userId: user.id, codeHash: hashCode(code), expiresAt });

      const sent = await this.emailService.sendPasswordResetCode({
        email,
        code,
        expiresInMinutes: PASSWORD_RESET_CODE_TTL_MINUTES,
      });

      return sent.success ? success(PASSWORD_RESET_NEUTRAL_MESSAGE) : failure(sent.error);
    } catch (error) {
      return failure(operationError("request code", error));
    }
  }

  async verifyCode(input: VerifyPasswordResetCodeInput): Promise<Result<true, AppError>> {
    try {
      const email = normalizeEmail(input.email);
      const user = await this.authRepository.findUserByEmail(email);

      if (!user || user.type !== "CUSTOMER") {
        return failure(new AppError("RESET_CODE_INVALID", "The verification code is invalid."));
      }

      const record = await this.resetRepository.findLatest(user.id);

      if (!record || record.usedAt) {
        return failure(new AppError("RESET_CODE_INVALID", "The verification code is invalid."));
      }

      if (record.expiresAt.getTime() <= Date.now()) {
        return failure(new AppError("RESET_CODE_EXPIRED", "The verification code has expired."));
      }

      if (record.attemptCount >= PASSWORD_RESET_MAX_ATTEMPTS) {
        return failure(new AppError("RESET_CODE_ATTEMPTS_EXCEEDED", "Too many verification attempts. Request a new code."));
      }

      if (!codesMatch(record.codeHash, input.code)) {
        const updated = await this.resetRepository.incrementAttempt(record.id);
        return failure(
          updated.attemptCount >= PASSWORD_RESET_MAX_ATTEMPTS
            ? new AppError("RESET_CODE_ATTEMPTS_EXCEEDED", "Too many verification attempts. Request a new code.")
            : new AppError("RESET_CODE_INVALID", "The verification code is invalid."),
        );
      }

      const verified = await this.resetRepository.markVerified(record.id);
      await setResetToken(createResetToken(verified.id, user.id, verified.expiresAt), verified.expiresAt);
      return success(true);
    } catch (error) {
      return failure(operationError("verify code", error));
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<Result<true, AppError>> {
    try {
      const token = await getResetToken();
      const payload = token ? verifyResetToken(token) : null;

      if (!payload) {
        return failure(new ForbiddenError("Your password reset session is no longer valid."));
      }

      const record = await this.resetRepository.findById(payload.codeId);
      const user = await this.authRepository.findUserWithAccessById(payload.userId as UserId);

      if (
        !record ||
        !user ||
        user.user.type !== "CUSTOMER" ||
        record.userId !== payload.userId ||
        !record.verifiedAt ||
        record.usedAt ||
        record.expiresAt.getTime() <= Date.now()
      ) {
        return failure(new ForbiddenError("Your password reset session is no longer valid."));
      }

      const passwordHash = await this.passwordHasher.hash(input.password);
      await this.authRepository.updatePasswordAndDeleteSessions(user.user.id, passwordHash);
      await this.resetRepository.markUsed(record.id);
      await clearResetToken();
      return success(true);
    } catch (error) {
      return failure(operationError("save password", error));
    }
  }
}
