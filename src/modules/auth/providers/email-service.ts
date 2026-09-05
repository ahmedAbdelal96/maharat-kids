import "server-only";

import { env } from "@/config/env";
import { failure, success, type Result } from "@/core/result";
import { AppError } from "@/core/errors";
import { logger } from "@/server/logger";

export interface EmailService {
  sendPasswordResetCode(input: { email: string; code: string; expiresInMinutes: number }): Promise<Result<true, AppError>>;
}

export class ResendEmailService implements EmailService {
  async sendPasswordResetCode(input: { email: string; code: string; expiresInMinutes: number }): Promise<Result<true, AppError>> {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      if (env.NODE_ENV === "development") {
        logger.info("Development password reset code generated", {
          expiresInMinutes: input.expiresInMinutes,
          delivery: "development-only",
        });
        return success(true);
      }

      return failure(new AppError("EMAIL_DELIVERY_NOT_CONFIGURED", "Email delivery is not configured."));
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [input.email],
          subject: "Your password reset code",
          text: `Your password reset code is: ${input.code}\n\nThis code expires in ${input.expiresInMinutes} minutes.\n\nIf you didn't request this, you can ignore this email.`,
        }),
      });

      if (!response.ok) {
        return failure(new AppError("EMAIL_DELIVERY_FAILED", "The password reset email could not be sent."));
      }

      return success(true);
    } catch (error) {
      return failure(new AppError("EMAIL_DELIVERY_FAILED", "The password reset email could not be sent.", { cause: error }));
    }
  }
}
