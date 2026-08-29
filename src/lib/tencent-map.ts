import "server-only";

export interface TencentPoint {
  lng: number;
  lat: number;
}

export interface TencentDrivingRoute {
  distanceMeters: number;
  /** 腾讯驾车路线接口返回分钟。 */
  durationMinutes: number;
  /** 解压后的真实道路坐标，供行程图绘制；不包含 Key。 */
  polyline: TencentPoint[];
}

type TencentResponse = {
  status?: number;
  message?: string;
  result?: { routes?: Array<{ distance?: number; duration?: number; polyline?: number[] }> };
};

/** 腾讯位置服务 WebService API：获取真实驾车道路轨迹。 */
export async function getTencentDrivingRoute(points: TencentPoint[]): Promise<TencentDrivingRoute> {
  if (points.length < 2 || points.length > 10) {
    throw new Error("行程图一次最多支持 10 个定位节点");
  }
  const key = process.env.TENCENT_MAP_KEY?.trim();
  if (!key) throw new Error("未配置腾讯位置服务 WebService Key");

  const asTencentPoint = (point: TencentPoint) => `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
  const query = new URLSearchParams({
    key,
    from: asTencentPoint(points[0]),
    to: asTencentPoint(points[points.length - 1]),
    policy: "RECOMMEND",
  });
  if (points.length > 2) query.set("waypoints", points.slice(1, -1).map(asTencentPoint).join(";"));

  const response = await fetch(`https://apis.map.qq.com/ws/direction/v1/driving/?${query.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("腾讯路线服务暂时不可用");

  const data = (await response.json()) as TencentResponse;
  if (data.status !== 0) {
    if (data.status === 121) throw new Error("腾讯路线服务今日配额已用完");
    if (data.status === 102) throw new Error("腾讯路线 Key 已停用");
    throw new Error(data.message || "腾讯未返回可用路线");
  }
  const route = data.result?.routes?.[0];
  const polyline = decodePolyline(route?.polyline ?? []);
  if (!route || polyline.length < 2) throw new Error("腾讯未返回道路轨迹");
  return {
    distanceMeters: Number(route.distance ?? 0),
    durationMinutes: Number(route.duration ?? 0),
    polyline,
  };
}

/** 腾讯 routes.polyline 使用差分压缩：第 3 个值开始需叠加前两个坐标后除以 1e6。 */
function decodePolyline(values: number[]): TencentPoint[] {
  if (values.length < 4) return [];
  const decoded = [...values];
  for (let index = 2; index < decoded.length; index++) decoded[index] = decoded[index - 2] + decoded[index] / 1_000_000;
  const points: TencentPoint[] = [];
  for (let index = 0; index < decoded.length - 1; index += 2) {
    const [lat, lng] = [decoded[index], decoded[index + 1]];
    if (Number.isFinite(lng) && Number.isFinite(lat)) points.push({ lng, lat });
  }
  return points;
}
