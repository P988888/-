import "server-only";

import type { AmapPoint } from "@/lib/amap";

export interface SatelliteMarkerMap {
  staticMapDataUrl: string;
}

/**
 * 腾讯静态地图 v2：卫星底图 + 编号点位标记。
 * 高德静态图只支持普通路网（无卫星图层），腾讯 `maptype=satellite` 提供真实卫星影像；
 * 二者都是 GCJ-02 坐标，可直接复用导游填写的景点经纬度。
 */
export async function getSatelliteMarkerMap(points: AmapPoint[]): Promise<SatelliteMarkerMap> {
  if (points.length < 1 || points.length > 10) throw new Error("点位地图需要 1—10 个定位点");
  const key = process.env.TENCENT_MAP_KEY?.trim();
  if (!key) throw new Error("未配置腾讯地图 Key");

  // 用 bounds 让所有点位自动落进图内并外扩一点边距，避免贴边。
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const span = Math.max(maxLat - minLat, maxLng - minLng, 0.01);
  const pad = span * 0.4;
  const bounds = `${(minLat - pad).toFixed(6)},${(minLng - pad).toFixed(6)};${(maxLat + pad).toFixed(6)},${(maxLng + pad).toFixed(6)}`;

  // 腾讯 marker 格式：`size:mid|color:red|label:1|lat,lng`；label 只支持单字符，编号点位需逐个 markers 参数。
  const params = [`key=${key}`, "size=750*300", "scale=2", "maptype=satellite", `bounds=${bounds}`];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    params.push(`markers=size:mid|color:red|label:${markerLabel(i)}|${p.lat.toFixed(6)},${p.lng.toFixed(6)}`);
  }
  const response = await fetch(`https://apis.map.qq.com/ws/staticmap/v2/?${params.join("&")}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/")) throw new Error("腾讯卫星地图暂时不可用");
  const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
  return { staticMapDataUrl: `data:${contentType};base64,${base64}` };
}

function markerLabel(index: number): string {
  return index < 9 ? String(index + 1) : String.fromCharCode(65 + (index - 9));
}
