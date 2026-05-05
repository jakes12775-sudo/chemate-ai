import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");

  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, savedHash] = storedHash.split(":");

  if (!salt || !savedHash) {
    return false;
  }

  const passwordBuffer = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const hashBuffer = Buffer.from(savedHash, "hex");

  if (passwordBuffer.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(passwordBuffer, hashBuffer);
}
