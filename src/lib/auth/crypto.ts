/**
 * 口令与 token 哈希（服务端）。原型阶段用 HMAC-SHA256，密钥来自 COOKIE_SIGNING_SECRET。
 * 只存哈希，不存明文；日志不打印口令与 token。
 */
import "server-only";
import crypto from "node:crypto";

function secret(): string {
  return process.env.COOKIE_SIGNING_SECRET || "aqian-dev-secret-change-me";
}

export function hashPin(pin: string): string {
  return crypto.createHmac("sha256", secret()).update(`pin:${pin}`).digest("hex");
}

export function verifyPin(pin: string, hash: string): boolean {
  const h = hashPin(pin);
  // 定长比较，避免时序侧信道
  return h.length === hash.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash));
}

export function hashToken(token: string): string {
  return crypto.createHmac("sha256", secret()).update(`tok:${token}`).digest("hex");
}

export function randomToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
