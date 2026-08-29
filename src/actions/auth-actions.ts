"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { verifyPin } from "@/lib/auth/crypto";
import { setGuideSession } from "@/lib/auth/session";
import { seedDemoTour } from "@/lib/db/seed";

const guideInput = z.object({ tourCode: z.string().trim().min(4).max(16), pin: z.string().regex(/^\d{4,6}$/) });

export async function verifyGuidePin(input: z.infer<typeof guideInput>) {
  const parsed = guideInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "请输入有效的团码和 4—6 位口令" };
  const code = parsed.data.tourCode.toUpperCase();
  if (code === "QY-1024") seedDemoTour();
  const tour = db.select().from(schema.tours).where(eq(schema.tours.code, code)).get();
  if (!tour || !verifyPin(parsed.data.pin, tour.guidePinHash)) {
    return { ok: false as const, error: "团码或导游口令不正确" };
  }
  await setGuideSession(code);
  return { ok: true as const, tourCode: code };
}
