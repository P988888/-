"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getMember } from "@/lib/auth/session";
import { getStoryCard as loadStoryCard, listKnowledgeByIds, nowId } from "@/lib/db/queries";

const eventInput = z.object({ tourCode: z.string().min(4), kind: z.enum(["listened", "answered", "observed"]), refId: z.string().min(1), payload: z.record(z.string(), z.unknown()).optional() });

export async function recordStoryEvent(input: z.infer<typeof eventInput>) {
  const parsed = eventInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "故事记录格式不正确" };
  const member = await getMember(parsed.data.tourCode);
  if (!member) return { ok: false as const, error: "入团身份已失效" };
  db.insert(schema.storyEvents).values({ id: nowId("e"), tourCode: member.tourCode, memberId: member.memberId,
    kind: parsed.data.kind, refId: parsed.data.refId, payload: parsed.data.payload ? JSON.stringify(parsed.data.payload) : null, createdAt: new Date().toISOString() }).run();
  return { ok: true as const };
}

export async function generateStoryCard(tourCode: string, knowledgeCardId?: string) {
  const member = await getMember(tourCode);
  if (!member) return { ok: false as const, reason: "unauthorized" as const };
  const allEvents = db.select().from(schema.storyEvents).where(and(eq(schema.storyEvents.tourCode, member.tourCode), eq(schema.storyEvents.memberId, member.memberId))).all();
  const listened = knowledgeCardId
    ? allEvents.filter((event) => event.kind === "listened" && event.refId === knowledgeCardId)
    : allEvents.filter((event) => event.kind === "listened");
  const answered = knowledgeCardId
    ? allEvents.filter((event) => (event.kind === "observed" || event.kind === "answered") && event.refId === knowledgeCardId)
    : allEvents.filter((event) => event.kind === "observed" || event.kind === "answered");
  if (!listened.length || !answered.length) return { ok: false as const, reason: "no_events" as const };
  const cardIds = [...new Set(listened.map((event) => event.refId))];
  const cards = listKnowledgeByIds(cardIds);
  if (!cards.length) return { ok: false as const, reason: "no_events" as const };
  const primary = cards[0];
  const existing = db.select({ id: schema.storyCards.id }).from(schema.storyCards)
    .where(and(eq(schema.storyCards.tourCode, member.tourCode), eq(schema.storyCards.memberId, member.memberId), eq(schema.storyCards.title, primary.title))).get();
  if (existing) return { ok: true as const, storyCardId: existing.id };
  const tour = db.select().from(schema.tours).where(eq(schema.tours.code, member.tourCode)).get();
  if (!tour) return { ok: false as const, reason: "no_events" as const };
  const observed = answered.at(-1);
  const observationPayload = observed?.payload ? JSON.parse(observed.payload) as { answer?: string; task?: string } : null;
  const id = nowId("story");
  db.transaction((tx) => {
    tx.insert(schema.storyCards).values({ id, tourCode: member.tourCode, memberId: member.memberId,
      title: primary.title, owner: member.nickname, route: storyRoute(primary.title, tour.route), date: new Date().toISOString(),
      stories: JSON.stringify(cards.map((card) => ({ title: card.title, note: card.contentZhShort, source: card.sourceTitle }))),
      observation: observationPayload ? JSON.stringify({ task: observationPayload.task ?? "阿黔邀请我观察的现场细节", answer: observationPayload.answer ?? "" }) : null,
      sources: JSON.stringify([...new Set(cards.map((card) => card.sourceTitle))]), createdAt: new Date().toISOString() }).run();
    tx.update(schema.members).set({ storyDone: true }).where(eq(schema.members.id, member.memberId)).run();
  });
  return { ok: true as const, storyCardId: id };
}

function storyRoute(title: string, fallback: string) {
  if (/蜡染|石头寨/.test(title)) return "黄果树 → 石头寨";
  if (/黄果树|瀑布|水帘洞/.test(title)) return "黄果树景区";
  if (/苗寨|西江|吊脚楼/.test(title)) return "西江千户苗寨";
  if (/白宫|花果园/.test(title)) return "贵阳 · 花果园";
  if (/青岩|石头城|背街/.test(title)) return "青岩古镇";
  return fallback;
}

export async function getStoryCard(storyCardId: string) { return loadStoryCard(storyCardId); }
