import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getTourByCode, getDays, getVerifiedKnowledge, nowId } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/demo";

export type ChatResult =
  | { kind: "answer"; message: ChatMessage }
  | { kind: "alert_card"; alertType: "delay" | "lost" | "health" | "help"; text: string };

const riskRules: { type: "delay" | "lost" | "health" | "help"; test: RegExp }[] = [
  { type: "health", test: /(不舒服|难受|受伤|头晕|胸闷|发烧|呕吐|腿疼|腿.*累|身体)/i },
  { type: "lost", test: /(迷路|走丢|找不到|走错|失联)/i },
  { type: "delay", test: /(迟到|赶不上|来不及|晚到)/i },
  { type: "help", test: /(求助|需要帮助|人工|help)/i },
];
const scheduleRule = /(几点|时间|集合|哪里等|在哪等|什么时候|发车|返程|meet|when|where)/i;
const facilityRule = /(厕所|洗手间|卫生间|热水|喝水|直饮|餐厅|吃饭|wc|toilet|restroom|water)/i;
const storyRule = /(故事|讲讲|讲一讲|介绍|历史|由来|传说|典故|来历|背景|文化)/i;

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function scheduleAnswer(tourCode: string): ChatMessage | null {
  const tour = getTourByCode(tourCode); if (!tour) return null;
  const day = getDays(tour.code).find((item) => item.day === tour.currentDay);
  const stage = day?.stages.find((item) => item.isCurrent) ?? day?.stages[0];
  if (!stage) return null;
  return {
    id: nowId("m"), role: "aqian", intent: "schedule",
    text: `请在 ${formatTime(stage.meetingTime)} 前回到${stage.point}集合。${stage.pointHint || "请留意导游的现场指引。"}`,
    source: `来自本团行程 · ${tour.guideName}更新`,
  };
}

function refusal(tourCode: string): ChatMessage {
  const tour = getTourByCode(tourCode);
  return { id: nowId("m"), role: "aqian", text: `这件事我暂时无法确认，不敢随便回答。我已为你保留当前团的集合信息；如需帮助，请直接联系${tour?.guideName ?? "导游"}，或点上方「我需要帮助」。`, source: "知识库未收录 · 已按规则转人工" };
}

function observationPrompt(title: string, content: string, language: "zh" | "en") {
  if (language === "en") return `Look around where you are now: what detail related to “${title}” catches your eye, and what feeling or question does it give you?`;
  const topic = /蜡染|靛蓝|留白/.test(`${title}${content}`)
    ? "找找花纹里被蜡留住的白色、靛蓝深浅或细小冰纹"
    : /瀑布|水帘|水声/.test(`${title}${content}`)
      ? "留意水声、水雾、岩壁和光线的变化"
      : /苗寨|吊脚楼|银饰/.test(`${title}${content}`)
        ? "看看吊脚楼、银饰纹样或寨子顺山势展开的层次"
        : /石|城门|马头墙|背街/.test(`${title}${content}`)
          ? "看看脚下石板、墙面痕迹、门洞光影或屋脊轮廓"
          : `找一个与你刚听到的“${title}”有关的现场细节`;
  return `别急着往前走，${topic}。哪一个细节最吸引你？它让你产生了什么感受，或还想追问什么？用一句话告诉我。`;
}

function answerFromCard(tourCode: string, message: string, language: "zh" | "en", storyLength: "short" | "deep") {
  const tour = getTourByCode(tourCode); if (!tour) return null;
  const cards = getVerifiedKnowledge(tour.code, message);
  const card = cards[0]; if (!card) return null;
  const isEn = language === "en";
  const isDeep = storyLength === "deep";
  const text = isEn ? (isDeep ? card.contentEnDeep : card.contentEnShort) : (isDeep ? card.contentZhDeep : card.contentZhShort);
  if (!text) return null;
  const isCulture = card.category === "culture";
  return { id: nowId("m"), role: "aqian" as const, intent: card.category === "facility" ? "facility" as const : "culture" as const,
    text, source: `来源：${card.sourceTitle}`, knowledgeCardIds: [card.id],
    observationPrompt: isCulture ? observationPrompt(card.title, text, language) : undefined };
}

/**
 * 知识库未命中、且是「讲故事 / 问背景」时，用千问按公开常识生成一段讲解。
 * 明确标注「AI 生成讲解 · 仅供参考」——事实（集合时间、设施位置）仍只来自知识卡与本团行程，绝不落到这里。
 */
async function generateStory(message: string, language: "zh" | "en"): Promise<ChatMessage | null> {
  const baseUrl = process.env.LLM_BASE_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.LLM_API_KEY?.trim();
  const model = process.env.LLM_MODEL?.trim() || "qwen3.8-max";
  if (!baseUrl || !apiKey) return null;
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: language === "en"
            ? "You are A-Qian, a Guizhou culture AI guide. Give a short, friendly spoken introduction (90-140 words) about the place the tourist asks about. Use only public/common knowledge; do not fabricate dates, names, figures, or unverified facts. If unsure, suggest confirming with the on-site guide. Output only the narration, no title or markdown."
            : "你是贵州文旅 AI 副导「阿黔」。用亲切的口语给游客讲一段他所问地点的文化故事或知识背景，约 90—140 字，像导游现场讲解。只讲公开常识与公认的文化背景，不编造具体年代、人物、数字或未核实的事；不确定就说「建议以现场讲解为准」。只输出讲解正文，不要标题、不要 markdown。" },
          { role: "user", content: message },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const body = await response.json() as { choices?: Array<{ message?: { content?: string | null } }>; error?: { message?: string } };
    if (!response.ok) return null;
    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return { id: nowId("m"), role: "aqian", intent: "culture", text: content, source: "AI 生成讲解 · 仅供参考",
      observationPrompt: observationPrompt(message, content, language) };
  } catch {
    return null;
  }
}

export async function classifyAndAnswer(input: { tourCode: string; memberId: string; language: "zh" | "en"; storyLength: "short" | "deep"; text: string }): Promise<ChatResult> {
  const text = input.text.trim();
  const risk = riskRules.find((rule) => rule.test.test(text));
  if (risk) return { kind: "alert_card", alertType: risk.type, text: "这件事需要交给真人导游处理，我先帮你发起求助。" };
  let candidate: ChatMessage | null = scheduleRule.test(text)
    ? scheduleAnswer(input.tourCode)
    : answerFromCard(input.tourCode, text, input.language, input.storyLength);
  // 讲故事/问背景且知识库没有卡：千问按公开常识生成一段，明确标注仅供参考。
  if (!candidate && storyRule.test(text) && !facilityRule.test(text) && !scheduleRule.test(text)) {
    candidate = await generateStory(text, input.language);
  }
  const answer = candidate ?? refusal(input.tourCode);
  const isFacility = facilityRule.test(text);
  const intent = risk ? "other" : scheduleRule.test(text) ? "schedule" : answer.intent ?? (isFacility ? "facility" : "other");
  const now = new Date().toISOString();
  const sourceLabel = answer.source?.replace(/^来源：/, "").replace(/^来自本团行程.*$/, "本团行程") ?? null;
  db.transaction((tx) => {
    tx.insert(schema.messages).values({ id: nowId("q"), tourCode: input.tourCode.toUpperCase(), memberId: input.memberId,
      memberNickname: db.select({ nickname: schema.members.nickname }).from(schema.members).where(eq(schema.members.id, input.memberId)).get()?.nickname ?? "游客",
      role: "user", content: text, intent, sourceLabel, knowledgeCardIds: "[]", createdAt: now }).run();
    tx.insert(schema.messages).values({ id: answer.id, tourCode: input.tourCode.toUpperCase(), memberId: input.memberId,
      memberNickname: "", role: "assistant", content: answer.text, intent: answer.intent ?? "other", sourceLabel,
      knowledgeCardIds: JSON.stringify("knowledgeCardIds" in answer ? answer.knowledgeCardIds : []), createdAt: now }).run();
  });
  return { kind: "answer", message: answer };
}
