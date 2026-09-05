import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

import type { PasswordHasher } from "../../identity/domain/services";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      },
    );
  });
}

export class ScryptPasswordHasher implements PasswordHasher {
  constructor(private readonly pepper: string) {}

  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH).toString("hex");
    const derivedKey = await deriveKey(`${password}\u0000${this.pepper}`, salt);

    return ["scrypt-v1", salt, derivedKey.toString("hex")].join("$");
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const [version, salt, storedKey] = passwordHash.split("$");

    if (version !== "scrypt-v1" || !salt || !storedKey || !/^[a-f0-9]+$/i.test(storedKey)) {
      return false;
    }

    try {
      const derivedKey = await deriveKey(`${password}\u0000${this.pepper}`, salt);
      const expectedKey = Buffer.from(storedKey, "hex");

      return expectedKey.length === derivedKey.length && timingSafeEqual(expectedKey, derivedKey);
    } catch {
      return false;
    }
  }
}
