"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { randomToken, hashToken } from "@/lib/auth/crypto";
import { setMemberSession, getMember } from "@/lib/auth/session";
import { getMembers } from "@/lib/db/queries";
import { seedDemoTour } from "@/lib/db/seed";

const joinInput = z.object({
  tourCode: z.string().trim().min(4).max(16), nickname: z.string().trim().min(1).max(12),
  language: z.enum(["zh", "en"]), interest: z.enum(["nature", "culture"]),
  storyLength: z.enum(["short", "deep"]).optional(),
});

export async function joinTour(input: z.infer<typeof joinInput>) {
  const parsed = joinInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "请补全入团信息" };
  const data = parsed.data;
  const code = data.tourCode.toUpperCase();
  if (code === "QY-1024") seedDemoTour();
  const tour = db.select({ code: schema.tours.code }).from(schema.tours).where(eq(schema.tours.code, code)).get();
  if (!tour) return { ok: false as const, error: "未找到这个团，请核对团码" };
  const id = `m-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.insert(schema.members).values({
    id, tourCode: code, nickname: data.nickname, memberTokenHash: hashToken(randomToken()),
    language: data.language, interest: data.interest, storyLength: data.storyLength ?? "short",
    status: "joined", joinedAt: now, lastSeenAt: now,
  }).run();
  await setMemberSession(code, id);
  return { ok: true as const, memberId: id };
}

export async function heartbeat(tourCode: string) {
  const member = await getMember(tourCode);
  if (!member) return { ok: false as const };
  db.update(schema.members).set({ lastSeenAt: new Date().toISOString() })
    .where(and(eq(schema.members.id, member.memberId), eq(schema.members.tourCode, member.tourCode))).run();
  return { ok: true as const };
}

export async function getMembersForGuide(tourCode: string) {
  const { requireGuide } = await import("@/lib/auth/session");
  await requireGuide(tourCode);
  return getMembers(tourCode);
}
