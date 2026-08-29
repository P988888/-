import { NextResponse } from "next/server";
import { isGuide } from "@/lib/auth/session";
import { getTencentDrivingRoute, type TencentPoint } from "@/lib/tencent-map";

export const dynamic = "force-dynamic";

/** 导游行程图专用代理：Key 仅服务端持有，路线数据仅登录导游可请求。 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tourCode?: unknown; points?: unknown };
    const tourCode = typeof body.tourCode === "string" ? body.tourCode.trim().toUpperCase() : "";
    if (!/^[A-Z0-9-]{4,20}$/.test(tourCode)) return NextResponse.json({ error: "团码格式不正确" }, { status: 400 });
    if (!(await isGuide(tourCode))) return NextResponse.json({ error: "需要导游身份" }, { status: 403 });
    const route = await getTencentDrivingRoute(parsePoints(body.points));
    return NextResponse.json({ source: "tencent", route }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "腾讯路线服务暂时不可用" }, { status: 502 });
  }
}

function parsePoints(input: unknown): TencentPoint[] {
  if (!Array.isArray(input) || input.length < 2 || input.length > 10) throw new Error("行程图一次最多支持 10 个定位节点");
  return input.map((value) => {
    const point = value as Partial<TencentPoint>;
    if (!Number.isFinite(point.lng) || !Number.isFinite(point.lat) || point.lng! < 73 || point.lng! > 135 || point.lat! < 3 || point.lat! > 54) {
      throw new Error("路线坐标不正确");
    }
    return { lng: Number(point.lng), lat: Number(point.lat) };
  });
}
