import { NextResponse } from "next/server";
import { z } from "zod";

const pointSchema = z.object({ lng: z.number(), lat: z.number() });
const inputSchema = z.object({
  dayTitle: z.string().trim().min(2).max(60),
  // fill: 补全已有节点的空白地点；suggest: 按主题推荐可快速添加的地点；skeleton: 只按主题生成整天行程骨架
  mode: z.enum(["fill", "suggest", "skeleton"]).default("fill"),
  anchors: z.array(z.object({
    time: z.string().max(8).optional().default(""),
    name: z.string().trim().max(60),
    point: z.string().trim().max(100),
    address: z.string().max(180).optional(),
    location: pointSchema.optional(),
  })).min(1).max(12).optional(),
});

type AmapPoi = { id: string; name: string; address: string; location: { lng: number; lat: number } };
type Anchor = { time: string; name: string; point: string; address?: string; location?: { lng: number; lat: number } };
type PlanItem = { anchorIndex: number; poiId: string; activityName?: string };

// 检索词里常见但无地理含义的头尾词，先剥掉再去高德搜，避免返回空白。
const CLUTTER_WORDS = [
  "集合入城", "集合出发", "集合地点", "集合点", "集合", "出发", "返程", "上车", "下车",
  "自由探索", "自由活动", "自由", "游览", "参观", "体验", "活动", "用餐", "午餐", "晚餐",
  "早餐", "吃午饭", "吃晚饭", "打卡", "拍照", "歇脚", "购物", "逛街", "观光", "门票",
  "上午", "下午", "中午", "早上", "晚上", "傍晚", "清晨", "上午时段", "下午时段",
].sort((a, b) => b.length - a.length);

function cleanKeyword(text: string): string {
  let t = (text || "").trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const w of CLUTTER_WORDS) {
      if (t.endsWith(w)) { t = t.slice(0, -w.length).trim(); changed = true; break; }
      if (t.startsWith(w)) { t = t.slice(w.length).trim(); changed = true; break; }
    }
  }
  return t.replace(/[··———,，。.、\s]+/g, " ").replace(/\s+/g, " ").trim();
}

/** 切成有意义的检索 token：连续中文（>=2字）或英文词，用于判断检索词与 POI 是否同指一地。 */
function tokens(text: string): string[] {
  return Array.from(cleanKeyword(text).match(/[\u4e00-\u9fa5]{2,}|[a-z]{2,}/g) ?? []);
}

type AmapSearchResponse = { status?: string; info?: string; pois?: Array<{ id?: string; name?: string; address?: string; location?: string }> };

async function queryAmap(searchParams: URLSearchParams): Promise<AmapSearchResponse> {
  const response = await fetch(`https://restapi.amap.com/v3/place/text?${searchParams.toString()}`, {
    cache: "no-store", signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("高德景点搜索暂时不可用");
  return response.json() as Promise<AmapSearchResponse>;
}

function toPois(data: AmapSearchResponse): AmapPoi[] {
  if (data.status !== "1") return [];
  return (data.pois ?? []).flatMap((poi) => {
    const [lng, lat] = (poi.location ?? "").split(",").map(Number);
    if (!poi.id || !poi.name || !Number.isFinite(lng) || !Number.isFinite(lat)) return [];
    // 交通站点不会作为旅游游览点候选。
    if (/(公交站|地铁站|高速入口|收费站)/.test(poi.name)) return [];
    return [{ id: poi.id, name: poi.name, address: poi.address || "贵州省", location: { lng, lat } }];
  });
}

/**
 * 单关键词高德检索：先按 city=贵州，空则去掉 city 再试一次（跨省/别称景点）。
 * 任何单路失败都吞掉，返回已命中的结果；绝不抛错让整日补全中断。
 */
async function searchAmap(keyword: string, offset = 16): Promise<AmapPoi[]> {
  const key = process.env.AMAP_KEY?.trim();
  if (!key) throw new Error("未配置高德 Web 服务 Key");
  const query = keyword.trim();
  if (!query) return [];
  const base = { key, keywords: query, citylimit: "false", offset: String(offset), output: "json" };
  let pois: AmapPoi[] = [];
  try { pois = toPois(await queryAmap(new URLSearchParams({ ...base, city: "贵州" }))); } catch { pois = []; }
  if (!pois.length) {
    try { pois = toPois(await queryAmap(new URLSearchParams(base))); } catch { pois = []; }
  }
  return pois;
}

/** 在候选里挑一个与检索词「同指一地」的 POI；已用过的 id 跳过，避免多个节点落到同一个点。 */
function pickConfident(query: string, pois: AmapPoi[], usedIds: Set<string>): AmapPoi | null {
  const q = cleanKeyword(query);
  if (!q || !pois.length) return null;
  const qn = q.toLowerCase();
  const qTokens = tokens(query);
  let best: AmapPoi | null = null;
  let bestScore = 0;
  for (const poi of pois) {
    if (usedIds.has(poi.id)) continue;
    const name = poi.name.toLowerCase();
    let score = 0;
    if (name === qn) score = 100;
    else if (name.includes(qn) || qn.includes(name)) score = 90;
    else if (qTokens.some((tok) => name.includes(tok))) score = 60;
    if (score > bestScore) { bestScore = score; best = poi; }
  }
  return bestScore >= 60 ? best : null;
}

/**
 * 第一层检索：优先搜「这个节点自己填的地点文字」，再退到环节名、再退到当日主题。
 * 这样 AI 补上的就是导游原本想去的地方，而不是主题附近的泛化景点。
 */
async function findBestPoi(anchor: Anchor, dayTitle: string, usedIds: Set<string>): Promise<AmapPoi | null> {
  const queries = [anchor.point, anchor.name, dayTitle]
    .map((q) => cleanKeyword(q))
    .filter((q) => q.length >= 2);
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const q of queries) { if (!seen.has(q)) { seen.add(q); uniq.push(q); } }
  for (const q of uniq) {
    try {
      const best = pickConfident(q, await searchAmap(q), usedIds);
      if (best) return best;
    } catch { /* 单路失败不阻塞，继续下一路 */ }
  }
  return null;
}

function applyPoi(anchor: Anchor, poi: AmapPoi): Anchor {
  return { time: anchor.time, name: anchor.name || poi.name, point: poi.name, address: poi.address, location: poi.location };
}

function toUserError(error: unknown) {
  return error instanceof Error ? error.message : "智能规划暂时不可用，请稍后重试";
}

/** 千问兜底：只从高德候选 id 里挑，坐标/地址永远取高德；结果不完整时返回已命中的部分，不抛错。 */
async function choosePoisWithQwen(dayTitle: string, anchors: Anchor[], unresolvedIndexes: number[], candidates: AmapPoi[]): Promise<PlanItem[]> {
  const baseUrl = process.env.LLM_BASE_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.LLM_API_KEY?.trim();
  const model = process.env.LLM_MODEL?.trim() || "qwen3.8-max";
  if (!baseUrl || !apiKey) return [];
  const prompt = {
    dayTitle,
    anchors: anchors.map((anchor, index) => ({ index, time: anchor.time, intent: anchor.name || "游览", lockedPoint: anchor.location ? anchor.point : undefined })),
    unresolvedIndexes,
    candidates,
  };
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你是贵州文旅导游的行程规划助手。只能从用户提供的 candidates 中选择 poiId，绝不能编造地点、地址、坐标或 poiId。按时间先后与景区内部顺路原则为每个 unresolvedIndexes 选择一个不重复的景点。仅输出 JSON：{\"plan\":[{\"anchorIndex\":0,\"poiId\":\"...\",\"activityName\":\"...\"}]}。" },
        { role: "user", content: JSON.stringify(prompt) },
      ],
    }),
    // Qwen3.8-Max 为推理模型，冷启动或复杂景区候选排序可能超过 30 秒。
    signal: AbortSignal.timeout(60_000),
  });
  const body = (await response.json()) as { choices?: Array<{ message?: { content?: string | null } }>; error?: { message?: string } };
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("千问 qwen3.8-max 尚未开通调用权限，请在百炼控制台开通后重试");
    throw new Error(body.error?.message || "千问行程规划暂时不可用");
  }
  const content = body.choices?.[0]?.message?.content;
  if (!content) return [];
  const clean = content.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const result = z.object({ plan: z.array(z.object({ anchorIndex: z.number().int(), poiId: z.string(), activityName: z.string().max(60).optional() })) }).safeParse(JSON.parse(clean));
  if (!result.success) return [];
  const expected = new Set(unresolvedIndexes);
  // 只保留仍然需要补、且未重复的合法项，其余交给调用方标记为 hole。
  return result.data.plan.filter((item) => expected.has(item.anchorIndex));
}

/** 按主题推荐可添加的景点列表（前端「快速添加」用）。 */
async function suggestHandler(dayTitle: string) {
  const key = process.env.AMAP_KEY?.trim();
  if (!key) return NextResponse.json({ error: "未配置高德 Web 服务 Key" }, { status: 503 });
  try {
    const pois = await searchAmap(dayTitle, 12);
    return NextResponse.json({
      suggestions: pois.map(({ id, name, address, location }) => ({ id, name, address, location })),
      source: "amap",
    });
  } catch (error) {
    return NextResponse.json({ error: toUserError(error) }, { status: 502 });
  }
}

/** 一天内节点数量的默认时间表，避免生成的骨架时间杂乱。 */
function timeGrid(count: number): string[] {
  const grids: Record<number, string[]> = {
    1: ["10:00"],
    2: ["09:30", "15:00"],
    3: ["09:00", "12:00", "16:00"],
    4: ["09:00", "11:00", "14:00", "16:30"],
    5: ["09:00", "10:30", "12:30", "15:00", "17:00"],
  };
  if (grids[count]) return grids[count].slice(0, count);
  return Array.from({ length: count }, (_, i) => {
    const mins = 9 * 60 + Math.round((i * (17 * 60 - 9 * 60)) / Math.max(count - 1, 1));
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  });
}

/** 只填当日主题，就给出整天行程骨架：节点（活动名 + 时间 + 高德真实点位）。 */
async function skeletonHandler(dayTitle: string) {
  const key = process.env.AMAP_KEY?.trim();
  if (!key) return NextResponse.json({ error: "未配置高德 Web 服务 Key" }, { status: 503 });
  try {
    const pois = (await searchAmap(dayTitle, 16)).slice(0, 4);
    if (!pois.length) return NextResponse.json({ error: "这个主题高德暂时没找到可推荐景点，请把主题写得更具体，例如“黄果树大瀑布游览”" }, { status: 502 });
    const times = timeGrid(pois.length);
    const stages = pois.map((poi, index) => {
      const name = index === 0 ? "出发游览" : index === pois.length - 1 ? "返程集合" : "自由游览";
      return { time: times[index], name, point: poi.name, address: poi.address, location: poi.location };
    });
    return NextResponse.json({ stages, source: "amap" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: toUserError(error) }, { status: 502 });
  }
}

/**
 * 「阿黔智能补全本日点位」主流程。
 * 第一层逐节点搜自己填的地点（锁定真实点位）；第二层用主题候选 + 千问兜底；
 * 仍缺的节点以 hole 标出，绝不整日 502 清空，避免出现一片空白。
 */
export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请先填写当日主题和每个节点的时间" }, { status: 400 });
  const { dayTitle, mode, anchors } = parsed.data;

  if (!process.env.AMAP_KEY?.trim()) return NextResponse.json({ error: "未配置高德 Web 服务 Key" }, { status: 503 });
  if (mode === "suggest") return suggestHandler(dayTitle);
  if (mode === "skeleton") return skeletonHandler(dayTitle);
  if (!anchors?.length) return NextResponse.json({ error: "请先为每个关键时间节点填写时间" }, { status: 400 });

  const unresolved = anchors.map((anchor, index) => ({ anchor, index })).filter(({ anchor }) => !anchor.location);
  if (!unresolved.length) return NextResponse.json({ stages: anchors, holes: [], source: "amap" });

  const stages: Anchor[] = anchors.map((a) => ({ ...a }));
  const usedIds = new Set<string>();
  const holes: number[] = [];

  // 第一层：逐节点按「自己填的地点」锁定真实 POI。
  for (const { anchor, index } of unresolved) {
    const poi = await findBestPoi(anchor, dayTitle, usedIds);
    if (poi) { stages[index] = applyPoi(anchor, poi); usedIds.add(poi.id); }
  }

  // 第二层：仍缺的节点，用当日主题候选 + 千问顺路排序兜底。
  const still = unresolved.filter(({ index }) => !stages[index].location);
  if (still.length) {
    let candidates: AmapPoi[] = [];
    try { candidates = await searchAmap(dayTitle, 16); } catch { candidates = []; }
    const fresh = candidates.filter((poi) => !usedIds.has(poi.id));
    if (fresh.length) {
      try {
        const choices = await choosePoisWithQwen(dayTitle, anchors, still.map(({ index }) => index), fresh);
        const candidateById = new Map(fresh.map((poi) => [poi.id, poi]));
        for (const choice of choices) {
          const poi = candidateById.get(choice.poiId);
          const idx = choice.anchorIndex;
          if (!poi || !stages[idx]?.location) continue;
          stages[idx] = applyPoi(anchors[idx], poi);
          usedIds.add(poi.id);
        }
      } catch { /* 千问失败不阻塞；缺的留 holes */ }
    }
  }

  for (const { index } of unresolved) if (!stages[index].location) holes.push(index);

  const source = still.length ? "qwen3.8-max + amap" : "amap";
  return NextResponse.json({ stages, holes, source }, { headers: { "Cache-Control": "no-store" } });
}
