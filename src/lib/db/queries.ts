import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema, sqlite } from "@/lib/db";
import type { GuideAlert, KnowledgeCardDTO, Member, QuestionItem, StoryCardDTO, TourDTO, TourDay } from "@/lib/contracts";

const asArray = <T>(value: string | null | undefined, fallback: T[] = []): T[] => {
  try {
    return value ? (JSON.parse(value) as T[]) : fallback;
  } catch {
    return fallback;
  }
};

export function getTourByCode(tourCode: string): TourDTO | null {
  const tour = db.select().from(schema.tours).where(eq(schema.tours.code, tourCode.toUpperCase())).get();
  if (!tour) return null;
  return {
    code: tour.code, name: tour.name, route: tour.route, guideName: tour.guideName,
    guidePhone: tour.guidePhone, status: tour.status, totalDays: tour.totalDays,
    currentDay: tour.currentDay, routeKey: tour.routeKey, startsAt: tour.startsAt,
  };
}

export function getDays(tourCode: string): TourDay[] {
  const days = db.select().from(schema.tourDays)
    .where(eq(schema.tourDays.tourCode, tourCode.toUpperCase()))
    .orderBy(asc(schema.tourDays.dayIndex)).all();
  const stages = db.select().from(schema.tourStages)
    .where(eq(schema.tourStages.tourCode, tourCode.toUpperCase()))
    .orderBy(asc(schema.tourStages.seq)).all();
  return days.map((day) => ({
    day: day.dayIndex, date: day.date, title: day.title,
    stages: stages.filter((stage) => stage.dayId === day.id).map((stage) => ({
      id: stage.id, seq: stage.seq, name: stage.name, meetingTime: stage.meetingTime,
      point: stage.point, pointHint: stage.pointHint, updatedAt: stage.updatedAt,
      isCurrent: stage.isCurrent, address: stage.address ?? undefined,
      location: stage.locationLng === null || stage.locationLat === null
        ? undefined : { lng: stage.locationLng, lat: stage.locationLat },
      photo: stage.photo ?? undefined,
      scenicStops: asArray(stage.scenicStops),
    })),
  }));
}

export function getMembers(tourCode: string): Member[] {
  return db.select().from(schema.members)
    .where(eq(schema.members.tourCode, tourCode.toUpperCase()))
    .orderBy(asc(schema.members.joinedAt)).all()
    .map((m) => ({ id: m.id, nickname: m.nickname, language: m.language,
      interest: m.interest, status: m.status, storyDone: m.storyDone }));
}

export function getAlerts(tourCode: string, memberId?: string): GuideAlert[] {
  const conditions = [eq(schema.alerts.tourCode, tourCode.toUpperCase())];
  if (memberId) conditions.push(eq(schema.alerts.memberId, memberId));
  return db.select().from(schema.alerts).where(and(...conditions))
    .orderBy(desc(schema.alerts.createdAt)).all().map((a) => ({
      id: a.id, memberNickname: a.memberNickname, type: a.type, summary: a.summary,
      landmark: a.landmarkText, createdAt: a.createdAt, status: a.status,
      guideResponse: a.guideResponse ?? undefined,
    }));
}

export function getQuestions(tourCode: string, intent?: QuestionItem["intent"]): QuestionItem[] {
  const conditions = [eq(schema.messages.tourCode, tourCode.toUpperCase()), eq(schema.messages.role, "user")];
  if (intent) conditions.push(eq(schema.messages.intent, intent));
  return db.select().from(schema.messages).where(and(...conditions))
    .orderBy(desc(schema.messages.createdAt)).all().map((m) => ({
      id: m.id, memberNickname: m.memberNickname || "游客", text: m.content,
      intent: (m.intent ?? "other") as QuestionItem["intent"], createdAt: m.createdAt,
      sourceLabel: m.sourceLabel ?? undefined,
    }));
}

export function getStoryCard(storyCardId: string): StoryCardDTO | null {
  const card = db.select().from(schema.storyCards).where(eq(schema.storyCards.id, storyCardId)).get();
  if (!card) return null;
  return {
    id: card.id, title: card.title, owner: card.owner, route: card.route, date: card.date,
    stories: asArray<{ title: string; note: string; source: string }>(card.stories),
    observation: card.observation ? JSON.parse(card.observation) as { task: string; answer: string } : null,
    sources: asArray<string>(card.sources),
  };
}

export function getStatus(tourCode: string, memberId?: string, includeGuideData = false) {
  const tour = getTourByCode(tourCode);
  if (!tour) return null;
  const members = includeGuideData ? getMembers(tour.code) : undefined;
  const questionCount = db.select({ count: sql<number>`count(*)` }).from(schema.messages)
    .where(and(eq(schema.messages.tourCode, tour.code), eq(schema.messages.role, "user"))).get()?.count ?? 0;
  // 游客端故事卡闭环：当前团的观察任务 + 该成员已生成的故事卡 id。
  const task = db.select().from(schema.storyTasks)
    .where(eq(schema.storyTasks.tourCode, tour.code)).get();
  const storyCardIds = memberId
    ? db.select({ id: schema.storyCards.id }).from(schema.storyCards)
        .where(and(eq(schema.storyCards.tourCode, tour.code), eq(schema.storyCards.memberId, memberId)))
        .orderBy(asc(schema.storyCards.createdAt)).all().map((card) => card.id)
    : undefined;
  const storyCardId = storyCardIds?.at(-1);
  return {
    serverTime: new Date().toISOString(), currentDay: tour.currentDay, days: getDays(tour.code),
    alerts: getAlerts(tour.code, memberId), members,
    stats: includeGuideData ? { questionCount, storyDone: members?.filter((m) => m.storyDone).length ?? 0, memberTotal: members?.length ?? 0 } : undefined,
    storyTask: task ? { id: task.id, title: task.title, brief: task.brief, clues: asArray<string>(task.clues) } : null,
    storyCardId, storyCardIds,
    questions: includeGuideData ? getQuestions(tour.code) : undefined,
  };
}

/** 知识库：本团的全部知识卡，导游端编辑页用。 */
export function getKnowledgeCards(tourCode: string): KnowledgeCardDTO[] {
  return db.select().from(schema.knowledgeCards)
    .where(eq(schema.knowledgeCards.tourCode, tourCode.toUpperCase()))
    .orderBy(schema.knowledgeCards.category, asc(schema.knowledgeCards.title)).all()
    .map((c) => ({
      id: c.id, routeKey: c.routeKey, stageKey: c.stageKey,
      category: c.category as KnowledgeCardDTO["category"], title: c.title,
      contentZhShort: c.contentZhShort, contentZhDeep: c.contentZhDeep,
      contentEnShort: c.contentEnShort, contentEnDeep: c.contentEnDeep,
      keywords: asArray<string>(c.keywords), dontSay: asArray<string>(c.dontSay),
      sourceTitle: c.sourceTitle, sourceUrl: c.sourceUrl,
      status: c.status as KnowledgeCardDTO["status"],
    }));
}

export function getVerifiedKnowledge(tourCode: string, message: string) {
  if (!tourCode) return [];
  const lower = message.toLowerCase();
  const terms: string[] = Array.from(lower.match(/[\u4e00-\u9fa5]{1,4}|[a-z]{2,}/g) ?? []);
  // 关键词命中：既算切词匹配，也算「整词作为子串直接出现」。
  // 后者是为了覆盖「洗手间」这类跨切词边界的关键词，避免导游新加的设施卡搜不到。
  return db.select().from(schema.knowledgeCards)
    .where(and(eq(schema.knowledgeCards.tourCode, tourCode.toUpperCase()), eq(schema.knowledgeCards.status, "verified"))).all()
    .map((card) => {
      const keywords = asArray<string>(card.keywords).map((x) => x.toLowerCase());
      const score = terms.reduce((n, term) => n + keywords.filter((word) => word.includes(term) || term.includes(word)).length, 0)
        + keywords.filter((word) => lower.includes(word)).length * 5;
      return { ...card, score };
    })
    .filter((card) => card.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function listKnowledgeByIds(ids: string[]) {
  return ids.length ? db.select().from(schema.knowledgeCards).where(inArray(schema.knowledgeCards.id, ids)).all() : [];
}

export function nowId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export { asArray, sqlite };
