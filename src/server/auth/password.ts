import "server-only";
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended Argon2id parameters (19 MiB, 2 iterations).
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string | null | undefined, password: string): Promise<boolean> {
  if (!passwordHash) {
    // Spend comparable time so response timing does not reveal whether the account exists.
    await hash(password, OPTIONS);
    return false;
  }
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
