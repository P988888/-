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

export async function generateStoryCard(tourCode: string) {
  const member = await getMember(tourCode);
  if (!member) return { ok: false as const, reason: "unauthorized" as const };
  const events = db.select().from(schema.storyEvents).where(and(eq(schema.storyEvents.tourCode, member.tourCode), eq(schema.storyEvents.memberId, member.memberId))).all();
  if (!events.length) return { ok: false as const, reason: "no_events" as const };
  const existing = db.select({ id: schema.storyCards.id }).from(schema.storyCards).where(and(eq(schema.storyCards.tourCode, member.tourCode), eq(schema.storyCards.memberId, member.memberId))).get();
  if (existing) return { ok: true as const, storyCardId: existing.id };
  const tour = db.select().from(schema.tours).where(eq(schema.tours.code, member.tourCode)).get();
  if (!tour) return { ok: false as const, reason: "no_events" as const };
  const cardIds = [...new Set(events.filter((e) => e.kind === "listened").map((e) => e.refId))];
  const cards = listKnowledgeByIds(cardIds);
  const observed = events.find((event) => event.kind === "observed" || event.kind === "answered");
  const observationPayload = observed?.payload ? JSON.parse(observed.payload) as { answer?: string; task?: string } : null;
  const id = nowId("story");
  db.transaction((tx) => {
    tx.insert(schema.storyCards).values({ id, tourCode: member.tourCode, memberId: member.memberId,
      title: cards[0]?.title ?? "我的贵州旅途", owner: member.nickname, route: tour.route, date: new Date().toISOString(),
      stories: JSON.stringify(cards.map((card) => ({ title: card.title, note: "这一路听过的导游审核内容", source: card.sourceTitle }))),
      observation: observationPayload ? JSON.stringify({ task: observationPayload.task ?? "我在旅途中观察到的细节", answer: observationPayload.answer ?? "" }) : null,
      sources: JSON.stringify(cards.map((card) => card.sourceTitle)), createdAt: new Date().toISOString() }).run();
    tx.update(schema.members).set({ storyDone: true }).where(eq(schema.members.id, member.memberId)).run();
  });
  return { ok: true as const, storyCardId: id };
}

export async function getStoryCard(storyCardId: string) { return loadStoryCard(storyCardId); }
