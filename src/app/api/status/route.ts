import { NextResponse } from "next/server";
import { getMember, isGuide } from "@/lib/auth/session";
import { getStatus } from "@/lib/db/queries";

export async function GET(request: Request) {
  const url = new URL(request.url), tourCode = url.searchParams.get("tourCode")?.trim().toUpperCase();
  const role = url.searchParams.get("role");
  if (!tourCode || (role !== "member" && role !== "guide")) return NextResponse.json({ error: "参数不正确" }, { status: 400 });
  if (role === "guide") {
    if (!(await isGuide(tourCode))) return NextResponse.json({ error: "需要导游身份" }, { status: 401 });
    const data = getStatus(tourCode, undefined, true); return data ? NextResponse.json(data) : NextResponse.json({ error: "未找到旅行团" }, { status: 404 });
  }
  const member = await getMember(tourCode);
  if (!member) return NextResponse.json({ error: "请先扫码进团" }, { status: 401 });
  const data = getStatus(tourCode, member.memberId, false);
  return data ? NextResponse.json(data) : NextResponse.json({ error: "未找到旅行团" }, { status: 404 });
}
