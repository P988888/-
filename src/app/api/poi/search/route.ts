import { NextResponse } from "next/server";

/** 高德 POI 搜索代理：景区内景点也使用真实 POI 坐标，Key 不暴露到浏览器。 */
export const dynamic = "force-dynamic";

type AmapPoi = { id?: string; name?: string; address?: string; location?: string };
type AmapSearchResponse = { status?: string; info?: string; pois?: AmapPoi[] };

async function searchAmap(key: string, keywords: string, city: boolean): Promise<AmapPoi[]> {
  const query = new URLSearchParams({
    key,
    keywords,
    city: city ? "贵州" : "",
    citylimit: "false",
    offset: "12",
    output: "json",
  });
  if (!city) query.delete("city");
  const response = await fetch(`https://restapi.amap.com/v3/place/text?${query.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const data = (await response.json()) as AmapSearchResponse;
  if (!response.ok) throw new Error(data.info || "高德 POI 服务暂时不可用");
  if (data.status !== "1") throw new Error(data.info || "高德 POI 服务暂时不可用");
  return data.pois ?? [];
}

function normalize(pois: AmapPoi[]): Array<{ id: string; name: string; address: string; location: { lng: number; lat: number } }> {
  return pois.flatMap((poi) => {
    const [lng, lat] = (poi.location ?? "").split(",").map(Number);
    if (!poi.name || !Number.isFinite(lng) || !Number.isFinite(lat)) return [];
    return [{ id: poi.id ?? `${lng}-${lat}`, name: poi.name, address: poi.address || "贵州省", location: { lng, lat } }];
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get("q")?.trim() ?? "";
  if (!keywords || keywords.length > 60) {
    return NextResponse.json({ error: "请输入 1—60 个字的景点名称" }, { status: 400 });
  }
  const key = process.env.AMAP_KEY?.trim();
  if (!key) return NextResponse.json({ error: "未配置高德 Web 服务 Key" }, { status: 503 });

  try {
    // 先按贵州省内搜；大量「景区 + 景点」在省外或带别称，空结果时去掉 city 再试一次。
    let pois = normalize(await searchAmap(key, keywords, true));
    if (!pois.length) pois = normalize(await searchAmap(key, keywords, false));
    return NextResponse.json({ pois }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "高德 POI 服务暂时不可用" }, { status: 502 });
  }
}
