"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getKnowledgeCards, getTourByCode, nowId } from "@/lib/db/queries";
import { isGuide } from "@/lib/auth/session";
import type { KnowledgeCardDTO } from "@/lib/contracts";

const cardShape = z.object({
  category: z.enum(["culture", "facility", "notice"]),
  stageKey: z.string().trim().max(40).optional().default(""),
  title: z.string().trim().min(1).max(80),
  contentZhShort: z.string().trim().max(1000).optional().default(""),
  contentZhDeep: z.string().trim().max(2000).optional().default(""),
  contentEnShort: z.string().trim().max(1000).optional().default(""),
  contentEnDeep: z.string().trim().max(2000).optional().default(""),
  keywords: z.array(z.string().trim().min(1).max(24)).max(30).optional().default([]),
  dontSay: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
  sourceTitle: z.string().trim().min(1).max(120),
  sourceUrl: z.string().trim().max(240).optional().default(""),
  status: z.enum(["draft", "verified"]).optional().default("verified"),
});

export type KnowledgeCardInput = z.infer<typeof cardShape>;

async function guard(tourCode: string) {
  if (!(await isGuide(tourCode))) return null;
  return getTourByCode(tourCode);
}

/** 知识库列表：本线路的知识卡（导游可增删改的检索源）。 */
export async function listKnowledgeCards(tourCode: string): Promise<KnowledgeCardDTO[]> {
  if (!(await isGuide(tourCode))) return [];
  return getKnowledgeCards(tourCode);
}

export async function createKnowledgeCard(tourCode: string, input: KnowledgeCardInput) {
  const tour = await guard(tourCode);
  if (!tour) return { ok: false as const, error: "需要导游身份，或该团不存在" };
  const parsed = cardShape.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "知识卡内容不完整，请检查必填项" };
  const d = parsed.data, id = nowId("k"), now = new Date().toISOString();
  db.insert(schema.knowledgeCards).values({
    id, tourCode: tour.code, routeKey: tour.routeKey ?? "", stageKey: d.stageKey || null, category: d.category, title: d.title,
    contentZhShort: d.contentZhShort, contentZhDeep: d.contentZhDeep,
    contentEnShort: d.contentEnShort, contentEnDeep: d.contentEnDeep,
    keywords: JSON.stringify(d.keywords), dontSay: JSON.stringify(d.dontSay),
    sourceTitle: d.sourceTitle, sourceUrl: d.sourceUrl || null,
    authorization: "verified", verifiedAt: now, status: d.status,
  }).run();
  revalidatePath(`/guide/${tour.code}`);
  return { ok: true as const, id };
}

export async function updateKnowledgeCard(tourCode: string, id: string, input: KnowledgeCardInput) {
  const tour = await guard(tourCode);
  if (!tour) return { ok: false as const, error: "需要导游身份，或该团不存在" };
  const parsed = cardShape.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "知识卡内容不完整，请检查必填项" };
  const d = parsed.data;
  const existing = db.select().from(schema.knowledgeCards)
    .where(and(eq(schema.knowledgeCards.id, id), eq(schema.knowledgeCards.tourCode, tour.code))).get();
  if (!existing) return { ok: false as const, error: "未找到该知识卡" };
  db.update(schema.knowledgeCards).set({
    category: d.category, stageKey: d.stageKey || null, title: d.title,
    contentZhShort: d.contentZhShort, contentZhDeep: d.contentZhDeep,
    contentEnShort: d.contentEnShort, contentEnDeep: d.contentEnDeep,
    keywords: JSON.stringify(d.keywords), dontSay: JSON.stringify(d.dontSay),
    sourceTitle: d.sourceTitle, sourceUrl: d.sourceUrl || null, status: d.status,
  }).where(eq(schema.knowledgeCards.id, id)).run();
  revalidatePath(`/guide/${tour.code}`);
  return { ok: true as const };
}

export async function deleteKnowledgeCard(tourCode: string, id: string) {
  const tour = await guard(tourCode);
  if (!tour) return { ok: false as const, error: "需要导游身份，或该团不存在" };
  const existing = db.select().from(schema.knowledgeCards)
    .where(and(eq(schema.knowledgeCards.id, id), eq(schema.knowledgeCards.tourCode, tour.code))).get();
  if (!existing) return { ok: false as const, error: "未找到该知识卡" };
  db.delete(schema.knowledgeCards).where(eq(schema.knowledgeCards.id, id)).run();
  revalidatePath(`/guide/${tour.code}`);
  return { ok: true as const };
}

/** 从游客真实提问抽取检索关键词：核心短语 + 2-4 字中文词 + 英文单词。 */
function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const zh = Array.from(new Set(Array.from(lower.match(/[\u4e00-\u9fa5]{2,4}/g) ?? [])));
  const en = Array.from(new Set(Array.from(lower.match(/[a-z]{3,}/g) ?? [])));
  const core = text.trim().replace(/[？?！!。，,]/g, "").slice(0, 20);
  return Array.from(new Set([...(core ? [core] : []), ...zh, ...en])).slice(0, 20);
}

const questionCardInput = z.object({
  question: z.string().trim().min(2).max(200),
  intent: z.enum(["schedule", "facility", "culture", "other"]).optional().default("other"),
});

/**
 * 把游客问过、但当前答不上（被拒答）的问题收录为一张「草稿知识卡」。
 * 导游随后在 设置 → 知识库 里补答案、标为已审核，下次同类提问即可命中。
 */
export async function collectQuestionAsKnowledgeCard(tourCode: string, input: z.infer<typeof questionCardInput>) {
  const tour = await guard(tourCode);
  if (!tour) return { ok: false as const, error: "需要导游身份，或该团不存在" };
  const parsed = questionCardInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "问题内容不正确" };
  const q = parsed.data.question.trim();
  const category = parsed.data.intent === "facility"
    ? "facility" as const
    : parsed.data.intent === "culture"
      ? "culture" as const
      : "notice" as const;
  const id = nowId("k");
  db.insert(schema.knowledgeCards).values({
    id, tourCode: tour.code, routeKey: tour.routeKey ?? "", stageKey: null, category,
    title: q.slice(0, 80),
    contentZhShort: "", contentZhDeep: "", contentEnShort: "", contentEnDeep: "",
    keywords: JSON.stringify(extractKeywords(q)), dontSay: "[]",
    sourceTitle: "游客提问收录 · 待导游补充来源", sourceUrl: null,
    authorization: "verified", verifiedAt: null, status: "draft",
  }).run();
  revalidatePath(`/guide/${tour.code}`);
  return { ok: true as const, id };
}
