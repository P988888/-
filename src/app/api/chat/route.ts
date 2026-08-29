import { NextResponse } from "next/server";
import { z } from "zod";
import { getMember } from "@/lib/auth/session";
import { classifyAndAnswer } from "@/lib/ai/rules";

const bodySchema = z.object({ tourCode: z.string().trim().min(4).max(16), message: z.string().trim().min(1).max(500) });
const windows = new Map<string, number[]>();
const LIMIT = 20, WINDOW_MS = 60_000;

function allowed(key: string) {
  const now = Date.now(), active = (windows.get(key) ?? []).filter((at) => at > now - WINDOW_MS);
  if (active.length >= LIMIT) return false;
  active.push(now); windows.set(key, active); return true;
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请求内容不正确" }, { status: 400 });
  const code = parsed.data.tourCode.toUpperCase();
  const member = await getMember(code);
  if (!member) return NextResponse.json({ error: "请先扫码进团" }, { status: 401 });
  if (!allowed(`${code}:${member.memberId}`)) return NextResponse.json({ error: "提问太频繁，请稍后再试" }, { status: 429 });
  return NextResponse.json(await classifyAndAnswer({ tourCode: code, memberId: member.memberId, language: member.language, storyLength: member.storyLength, text: parsed.data.message }));
}
