import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const betaCookie = "__Host-commonplace_beta";
const hash = (text: string) => createHash("sha256").update(text).digest();
export class BetaAccess {
  readonly code = randomBytes(4).toString("hex").toUpperCase();
  readonly expiresAt: number;
  private attempts = new Map<string, { since: number; count: number }>();
  constructor(
    private token: string,
    now = Date.now(),
  ) {
    this.expiresAt = now + 30 * 60_000;
  }
  authorized(cookie: string | undefined) {
    const value = cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${betaCookie}=`))
      ?.slice(betaCookie.length + 1);
    return Boolean(value && timingSafeEqual(hash(value), hash(this.token)));
  }
  pair(value: string, address: string, now = Date.now()) {
    let attempts = this.attempts.get(address);
    if (!attempts || now - attempts.since > 60_000) {
      attempts = { since: now, count: 0 };
      this.attempts.set(address, attempts);
    }
    attempts.count++;
    if (attempts.count > 10 || now > this.expiresAt) return false;
    const accepted = timingSafeEqual(
      hash(value.replace(/[\s-]/g, "").toUpperCase()),
      hash(this.code),
    );
    if (accepted) this.attempts.delete(address);
    return accepted;
  }
  cookie() {
    return `${betaCookie}=${this.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`;
  }
}

export function isPrivateIPv4(value: string) {
  const parts = value.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  )
    return false;
  const [a, b] = parts;
  return (
    a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
  );
}
