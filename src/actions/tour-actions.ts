"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { hashPin } from "@/lib/auth/crypto";
import { requireGuide, setGuideSession } from "@/lib/auth/session";
import { getDays, getTourByCode, nowId } from "@/lib/db/queries";
import { seedDemoTour } from "@/lib/db/seed";

const stageInput = z.object({
  time: z.string().max(8).optional(),
  name: z.string().trim().min(1).max(60),
  point: z.string().trim().min(1).max(100), pointHint: z.string().max(160).optional(),
  address: z.string().max(180).optional(), location: z.object({ lng: z.number(), lat: z.number() }).optional(),
  photo: z.string().max(1000).optional(),
  scenicStops: z.array(z.object({ name: z.string().trim().min(1).max(60), address: z.string().max(180).optional(), location: z.object({ lng: z.number(), lat: z.number() }).optional() })).max(8).optional(),
});
const createInput = z.object({
  name: z.string().trim().min(2).max(40), guideName: z.string().trim().min(1).max(16),
  // 游客端「我的」和紧急转人工都依赖这一个本团联系电话，不允许创建空号码团。
  guidePhone: z.string().trim().regex(/^1[3-9]\d{9}$/, "请输入有效的中国大陆手机号码"), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(["template", "custom"]), routeKey: z.string().max(60).optional(),
  days: z.array(z.object({ title: z.string().trim().min(1).max(60), stages: z.array(stageInput).min(1).max(12) })).min(1).max(10),
  guidePin: z.string().regex(/^\d{4,6}$/),
});

function makeTourCode() {
  for (let i = 0; i < 12; i++) {
    const code = `QY-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!db.select({ code: schema.tours.code }).from(schema.tours).where(eq(schema.tours.code, code)).get()) return code;
  }
  return `QY-${Date.now().toString().slice(-6)}`;
}
function stageTime(date: string, time: string) { return new Date(`${date}T${time}:00+08:00`).toISOString(); }
/** 创建团不再要求导游填时间：按节点顺序给一版默认集合时间，导游可事后在驾驶舱调整。 */
function defaultStageTime(seq: number): string {
  const grid = ["09:00", "11:00", "13:30", "15:30", "17:00"];
  if (seq <= grid.length) return grid[seq - 1];
  // 超过 5 个节点时继续按 +30 分钟递增，保证时间单调不倒退。
  const h = 17 + Math.floor((seq - grid.length) / 2), m = (seq - grid.length) % 2 ? 30 : 0;
  return `${String(Math.min(h, 20)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function dateAt(startDate: string, offset: number) {
  const day = new Date(`${startDate}T00:00:00+08:00`); day.setUTCDate(day.getUTCDate() + offset); return day.toISOString();
}
function dateKeyAt(startDate: string, offset: number) {
  const day = new Date(`${startDate}T00:00:00+08:00`); day.setUTCDate(day.getUTCDate() + offset);
  return day.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}

export async function createTour(input: z.infer<typeof createInput>) {
  const parsed = createInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "行程或口令格式不正确" };
  const data = parsed.data, code = makeTourCode(), now = new Date().toISOString();
  const route = data.days.map((d) => d.title).join(" — ").slice(0, 160);
  db.transaction((tx) => {
    tx.insert(schema.tours).values({ code, name: data.name, route, guideName: data.guideName,
      guidePhone: data.guidePhone, guidePinHash: hashPin(data.guidePin), status: "active",
      totalDays: data.days.length, currentDay: 1, routeKey: data.mode === "template" ? data.routeKey ?? null : null,
      startsAt: dateAt(data.startDate, 0), createdAt: now }).run();
    data.days.forEach((day, dayIndex) => {
      const id = nowId("d"); const date = dateAt(data.startDate, dayIndex);
      tx.insert(schema.tourDays).values({ id, tourCode: code, dayIndex: dayIndex + 1, date, title: day.title }).run();
      day.stages.forEach((stage, index) => tx.insert(schema.tourStages).values({
        id: nowId("s"), tourCode: code, dayId: id, seq: index + 1, name: stage.name,
        meetingTime: stageTime(dateKeyAt(data.startDate, dayIndex), stage.time || defaultStageTime(index + 1)), point: stage.point, pointHint: stage.pointHint ?? "",
        isCurrent: index === 0, address: stage.address ?? null, locationLng: stage.location?.lng ?? null,
        locationLat: stage.location?.lat ?? null, photo: stage.photo ?? null,
        scenicStops: JSON.stringify(stage.scenicStops ?? []), updatedAt: now,
      }).run());
    });
  });
  await setGuideSession(code);
  return { ok: true as const, tourCode: code };
}

export async function updateMeetingInfo(input: { tourCode: string; stageId: string; meetingTime: string; meetingPoint: string; pointHint?: string; photo?: string; scenicStops?: { name: string; address?: string; location?: { lng: number; lat: number } }[] }) {
  await requireGuide(input.tourCode);
  const parsed = z.object({ tourCode: z.string().min(4), stageId: z.string().min(1), meetingTime: z.string().datetime(), meetingPoint: z.string().trim().min(1).max(100), pointHint: z.string().max(160).optional(), photo: z.string().max(1000).optional(), scenicStops: z.array(z.object({ name: z.string().trim().min(1).max(60), address: z.string().max(180).optional(), location: z.object({ lng: z.number(), lat: z.number() }).optional() })).max(8).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "集合信息格式不正确" };
  const now = new Date().toISOString();
  const updated = db.update(schema.tourStages).set({ meetingTime: parsed.data.meetingTime, point: parsed.data.meetingPoint, pointHint: parsed.data.pointHint ?? "", photo: parsed.data.photo ?? null, scenicStops: JSON.stringify(parsed.data.scenicStops ?? []), updatedAt: now })
    .where(and(eq(schema.tourStages.id, parsed.data.stageId), eq(schema.tourStages.tourCode, parsed.data.tourCode.toUpperCase()))).run();
  if (!updated.changes) return { ok: false as const, error: "未找到要修改的集合节点" };
  revalidatePath(`/tour/${parsed.data.tourCode}`); revalidatePath(`/guide/${parsed.data.tourCode}`);
  return { ok: true as const, updatedAt: now };
}

export async function advanceTourDay(tourCode: string) {
  await requireGuide(tourCode); const tour = getTourByCode(tourCode);
  if (!tour) return { ok: false as const, error: "未找到旅行团" };
  const next = Math.min(tour.currentDay + 1, tour.totalDays);
  db.update(schema.tours).set({ currentDay: next }).where(eq(schema.tours.code, tour.code)).run();
  revalidatePath(`/tour/${tour.code}`); revalidatePath(`/guide/${tour.code}`);
  return { ok: true as const, currentDay: next };
}

export async function resetDemoTour(tourCode: string) {
  await requireGuide(tourCode);
  if (tourCode.toUpperCase() !== "QY-1024") return { ok: false as const, error: "只有演示团可以恢复初始数据" };
  seedDemoTour(true); revalidatePath("/", "layout");
  return { ok: true as const };
}

export { getDays, getTourByCode };
