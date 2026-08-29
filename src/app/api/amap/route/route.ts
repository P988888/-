import { NextResponse } from "next/server";
import { getMember, isGuide } from "@/lib/auth/session";
import { getAmapDrivingRoute, getAmapMarkerMap, getAmapWalkingRoute, type AmapPoint } from "@/lib/amap";
import { getSatelliteMarkerMap } from "@/lib/tencent";

/** 本团路线图代理：高德/腾讯 Key 只保留在服务端，仅本团导游或已进团游客可请求。 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tourCode?: unknown; points?: unknown; mode?: unknown };
    const tourCode = typeof body.tourCode === "string" ? body.tourCode.trim().toUpperCase() : "";
    if (!/^[A-Z0-9-]{4,20}$/.test(tourCode)) return NextResponse.json({ error: "团码格式不正确" }, { status: 400 });
    const [guide, member] = await Promise.all([isGuide(tourCode), getMember(tourCode)]);
    if (!guide && !member) return NextResponse.json({ error: "需要本团成员身份" }, { status: 403 });
    const mode = body.mode === "walking" ? "walking" : body.mode === "markers" ? "markers" : "driving";
    const route = mode === "walking"
      ? await getAmapWalkingRoute(parsePoints(body.points, 9, 2))
      : mode === "markers"
        ? await getMarkerMap(parsePoints(body.points, 10, 1))
        : await getAmapDrivingRoute(parsePoints(body.points, 18, 2));
    return NextResponse.json({ source: mode === "markers" ? "tencent" : "amap", mode, route }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "地图服务暂时不可用" }, { status: 502 });
  }
}

async function getMarkerMap(points: AmapPoint[]) {
  // 优先腾讯卫星图；免费 key 额度有限时降级到高德路网点位图，仍保证真实地图上的编号标记。
  try {
    const map = await getSatelliteMarkerMap(points);
    return { distanceMeters: 0, durationSeconds: 0, polyline: [], staticMapDataUrl: map.staticMapDataUrl, style: "satellite" as const };
  } catch {
    const route = await getAmapMarkerMap(points);
    return { distanceMeters: 0, durationSeconds: 0, polyline: [], staticMapDataUrl: route.staticMapDataUrl, style: "roadmap" as const };
  }
}

function parsePoints(input: unknown, max: number, min = 2): AmapPoint[] {
  if (!Array.isArray(input) || input.length < min || input.length > max) throw new Error(`行程图需要 ${min}—${max} 个定位节点`);
  return input.map((value) => {
    const point = value as Partial<AmapPoint>;
    if (!Number.isFinite(point.lng) || !Number.isFinite(point.lat) || point.lng! < 73 || point.lng! > 135 || point.lat! < 3 || point.lat! > 54) {
      throw new Error("路线坐标不正确");
    }
    return { lng: Number(point.lng), lat: Number(point.lat) };
  });
}
