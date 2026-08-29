/**
 * 会话：游客 member token 与导游口令，均以 jose 签名后写 HttpOnly Cookie。
 * - 游客 Cookie：aq_m_<TOURCODE> = JWT{ sub: memberId, code }
 * - 导游 Cookie：aq_g_<TOURCODE> = JWT{ code, role: 'guide' }
 * SameSite=Lax；生产（HTTPS）下 Secure。密钥只在服务端。
 */
import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

function key(): Uint8Array {
  return new TextEncoder().encode(
    process.env.COOKIE_SIGNING_SECRET || "aqian-dev-secret-change-me"
  );
}

const memberCookie = (code: string) => `aq_m_${code.toUpperCase()}`;
const guideCookie = (code: string) => `aq_g_${code.toUpperCase()}`;

async function sign(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2d")
    .sign(key());
}

async function verify<T = Record<string, unknown>>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as T;
  } catch {
    return null;
  }
}

/* ---------- 游客 ---------- */

export async function setMemberSession(tourCode: string, memberId: string) {
  const jwt = await sign({ sub: memberId, code: tourCode.toUpperCase() });
  const store = await cookies();
  store.set(memberCookie(tourCode), jwt, {
    httpOnly: true,
    secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 2,
  });
}

export interface MemberCtx {
  memberId: string;
  tourCode: string;
  nickname: string;
  language: "zh" | "en";
  interest: "nature" | "culture";
  storyLength: "short" | "deep";
}

/** 读取并校验当前团的游客身份；返回 null 表示未登录/越权 */
export async function getMember(tourCode: string): Promise<MemberCtx | null> {
  const store = await cookies();
  const raw = store.get(memberCookie(tourCode))?.value;
  if (!raw) return null;
  const payload = await verify<{ sub: string; code: string }>(raw);
  if (!payload || payload.code !== tourCode.toUpperCase()) return null;

  const row = db
    .select()
    .from(schema.members)
    .where(
      and(
        eq(schema.members.id, payload.sub),
        eq(schema.members.tourCode, tourCode.toUpperCase())
      )
    )
    .get();
  if (!row) return null;
  return {
    memberId: row.id,
    tourCode: row.tourCode,
    nickname: row.nickname,
    language: row.language,
    interest: row.interest,
    storyLength: row.storyLength,
  };
}

/** 允许用 token 直接换取会话（现场固定链接进入，见 seed 的 DEMO_MEMBER_TOKENS） */
export async function resolveMemberByToken(
  tourCode: string,
  token: string
): Promise<string | null> {
  const { hashToken } = await import("@/lib/auth/crypto");
  const row = db
    .select()
    .from(schema.members)
    .where(
      and(
        eq(schema.members.tourCode, tourCode.toUpperCase()),
        eq(schema.members.memberTokenHash, hashToken(token))
      )
    )
    .get();
  return row?.id ?? null;
}

/* ---------- 导游 ---------- */

export async function setGuideSession(tourCode: string) {
  const jwt = await sign({ code: tourCode.toUpperCase(), role: "guide" });
  const store = await cookies();
  store.set(guideCookie(tourCode), jwt, {
    httpOnly: true,
    secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 2,
  });
}

export async function isGuide(tourCode: string): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(guideCookie(tourCode))?.value;
  if (!raw) return false;
  const payload = await verify<{ code: string; role: string }>(raw);
  return !!payload && payload.role === "guide" && payload.code === tourCode.toUpperCase();
}

/** Server Action / API 入口守卫：非导游抛错 */
export async function requireGuide(tourCode: string): Promise<void> {
  if (!(await isGuide(tourCode))) {
    throw new Error("需要导游身份");
  }
}
