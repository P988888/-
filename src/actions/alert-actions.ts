"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getMember, requireGuide } from "@/lib/auth/session";
import { nowId } from "@/lib/db/queries";

const alertInput = z.object({
  tourCode: z.string().trim().min(4).max(16), type: z.enum(["delay", "lost", "health", "help"]),
  summary: z.string().trim().min(1).max(240), landmarkText: z.string().trim().max(160).default(""),
  oneTimeLocation: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable().optional(),
});

export async function createAlert(input: z.infer<typeof alertInput>) {
  const parsed = alertInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "求助信息格式不正确" };
  const data = parsed.data, member = await getMember(data.tourCode);
  if (!member) return { ok: false as const, error: "入团身份已失效，请重新扫码进团" };
  const now = new Date().toISOString(), id = nowId("a");
  db.transaction((tx) => {
    tx.insert(schema.alerts).values({ id, tourCode: member.tourCode, memberId: member.memberId,
      memberNickname: member.nickname, type: data.type, summary: data.summary, landmarkText: data.landmarkText,
      oneTimeLocation: data.oneTimeLocation ? JSON.stringify(data.oneTimeLocation) : null, status: "open", createdAt: now }).run();
    tx.update(schema.members).set({ status: "help_pending", lastSeenAt: now })
      .where(and(eq(schema.members.id, member.memberId), eq(schema.members.tourCode, member.tourCode))).run();
  });
  revalidatePath(`/guide/${member.tourCode}`);
  return { ok: true as const, alertId: id };
}

export async function acknowledgeAlert(input: { alertId: string; tourCode: string; response?: string }) {
  await requireGuide(input.tourCode);
  const alert = db.select().from(schema.alerts).where(and(eq(schema.alerts.id, input.alertId), eq(schema.alerts.tourCode, input.tourCode.toUpperCase()))).get();
  if (!alert) return { ok: false as const, error: "未找到该求助" };
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(schema.alerts).set({ status: "acknowledged", guideResponse: input.response?.trim() || "已联系，请原地等候", acknowledgedAt: now }).where(eq(schema.alerts.id, alert.id)).run();
    if (alert.memberId) tx.update(schema.members).set({ status: "help_acknowledged" }).where(eq(schema.members.id, alert.memberId)).run();
  });
  revalidatePath(`/tour/${alert.tourCode}`); revalidatePath(`/guide/${alert.tourCode}`);
  return { ok: true as const };
}

export async function resolveAlert(input: { alertId: string; tourCode: string }) {
  await requireGuide(input.tourCode);
  const alert = db.select().from(schema.alerts).where(and(eq(schema.alerts.id, input.alertId), eq(schema.alerts.tourCode, input.tourCode.toUpperCase()))).get();
  if (!alert) return { ok: false as const, error: "未找到该求助" };
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(schema.alerts).set({ status: "resolved", resolvedAt: now }).where(eq(schema.alerts.id, alert.id)).run();
    if (alert.memberId) tx.update(schema.members).set({ status: "checked_in" }).where(eq(schema.members.id, alert.memberId)).run();
  });
  revalidatePath(`/tour/${alert.tourCode}`); revalidatePath(`/guide/${alert.tourCode}`);
  return { ok: true as const };
}
