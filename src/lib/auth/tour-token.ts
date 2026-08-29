/**
 * 会话签发与校验（jose 签名 JWT，写 HttpOnly + SameSite=Lax Cookie）。
 * - 游客：member token cookie `aqian_m`，绑定 tourCode + memberId
 * - 导游：guide cookie `aqian_g`，绑定 tourCode
 * requireMember / requireGuide 供 Server Actions 与 /api/* 入口做归属校验。
 */
import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const MEMBER_COOKIE = "aqian_m";
const GUIDE_COOKIE = "aqian_g";

function key(): Uint8Array {
  return new TextEncoder().encode(
    process.env.COOKIE_SIGNING_SECRET || "aqian-dev-secret-change-me"
  );
}

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

// ————— 游客 —————

export async function issueMemberCookie(tourCode: string, memberId: string) {
  const jwt = await new SignJWT({ tourCode, memberId, role: "member" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
  const jar = await cookies();
  jar.set(MEMBER_COOKIE, jwt, { ...baseCookie, maxAge: 7 * 24 * 3600 });
}

export interface MemberSession {
  tourCode: string;
  memberId: string;
  nickname: string;
}

/** 读取并校验游客会话；要求属于指定团。失败返回 null（不抛，方便页面回退演示态） */
export async function getMemberSession(
  tourCode?: string
): Promise<MemberSession | null> {
  const jar = await cookies();
  const raw = jar.get(MEMBER_COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, key());
    if (payload.role !== "member") return null;
    const tc = String(payload.tourCode);
    const mid = String(payload.memberId);
    if (tourCode && tc.toUpperCase() !== tourCode.toUpperCase()) return null;
    const m = db
      .select({ nickname: schema.members.nickname })
      .from(schema.members)
      .where(and(eq(schema.members.id, mid), eq(schema.members.tourCode, tc)))
      .get();
    if (!m) return null;
    return { tourCode: tc, memberId: mid, nickname: m.nickname };
  } catch {
    return null;
  }
}

/** 硬校验：失败即抛，用于必须鉴权的写操作 */
export async function requireMember(tourCode: string): Promise<MemberSession> {
  const s = await getMemberSession(tourCode);
  if (!s) throw new Error("UNAUTHORIZED_MEMBER");
  return s;
}

// ————— 导游 —————

export async function issueGuideCookie(tourCode: string) {
  const jwt = await new SignJWT({ tourCode, role: "guide" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2d")
    .sign(key());
  const jar = await cookies();
  jar.set(GUIDE_COOKIE, jwt, { ...baseCookie, maxAge: 2 * 24 * 3600 });
}

export async function getGuideSession(
  tourCode?: string
): Promise<{ tourCode: string } | null> {
  const jar = await cookies();
  const raw = jar.get(GUIDE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, key());
    if (payload.role !== "guide") return null;
    const tc = String(payload.tourCode);
    if (tourCode && tc.toUpperCase() !== tourCode.toUpperCase()) return null;
    return { tourCode: tc };
  } catch {
    return null;
  }
}

export async function requireGuide(tourCode: string): Promise<{ tourCode: string }> {
  const s = await getGuideSession(tourCode);
  if (!s) throw new Error("UNAUTHORIZED_GUIDE");
  return s;
}

export async function clearSessions() {
  const jar = await cookies();
  jar.delete(MEMBER_COOKIE);
  jar.delete(GUIDE_COOKIE);
}
