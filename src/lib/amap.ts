import "server-only";

export interface AmapPoint {
  lng: number;
  lat: number;
}

export interface AmapDrivingRoute {
  distanceMeters: number;
  durationSeconds: number;
  /** 高德返回的 GCJ-02 真实道路坐标，前端只接收轨迹，不接收 Key。 */
  polyline: AmapPoint[];
  /** 由高德静态地图生成的真实底图，已包含路线与景点标注。 */
  staticMapDataUrl?: string;
}

type AmapPath = {
  distance?: string;
  duration?: string;
  cost?: { duration?: string };
  steps?: Array<{ polyline?: string }>;
};
type AmapResponse = {
  status?: string;
  info?: string;
  route?: { paths?: AmapPath[] };
};

/** 高德 Web 服务 API v5：返回真实驾车道路轨迹、里程与耗时。 */
export async function getAmapDrivingRoute(points: AmapPoint[]): Promise<AmapDrivingRoute> {
  if (points.length < 2 || points.length > 18) throw new Error("行程图至少需要 2 个、最多支持 18 个定位节点");
  const key = process.env.AMAP_KEY?.trim();
  if (!key) throw new Error("未配置高德 Web 服务 Key");

  const asAmapPoint = (point: AmapPoint) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;
  const query = new URLSearchParams({
    key,
    origin: asAmapPoint(points[0]),
    destination: asAmapPoint(points[points.length - 1]),
    strategy: "32",
    show_fields: "cost,polyline",
    output: "json",
  });
  if (points.length > 2) query.set("waypoints", points.slice(1, -1).map(asAmapPoint).join(";"));

  const response = await fetchMapService(`https://restapi.amap.com/v5/direction/driving?${query.toString()}`);
  if (!response.ok) throw new Error("高德路线服务暂时不可用");
  const data = (await response.json()) as AmapResponse;
  if (data.status !== "1") throw new Error(data.info || "高德未返回可用路线");

  const path = data.route?.paths?.[0];
  const polyline = (path?.steps ?? []).flatMap((step) => parsePolyline(step.polyline));
  if (!path || polyline.length < 2) throw new Error("高德未返回道路轨迹");
  const route = {
    distanceMeters: Number(path.distance ?? 0),
    durationSeconds: Number(path.cost?.duration ?? path.duration ?? 0),
    polyline,
  };
  // 静态图失败不影响路线计算：页面会继续用真实道路折线作为降级展示。
  try {
    return { ...route, staticMapDataUrl: await createStaticMap(polyline, points, "driving") };
  } catch {
    return route;
  }
}

/**
 * 景区内游览用步行算路。高德步行 API 不接收途经点，因此按相邻景点分段请求后拼成一条
 * 实际步道路线；这样景区内路线不会被误算成车行路线。
 */
export async function getAmapWalkingRoute(points: AmapPoint[]): Promise<AmapDrivingRoute> {
  if (points.length < 2 || points.length > 9) throw new Error("景区内路线至少需要 2 个、最多支持 9 个节点");
  const key = process.env.AMAP_KEY?.trim();
  if (!key) throw new Error("未配置高德 Web 服务 Key");
  const asAmapPoint = (point: AmapPoint) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;
  const routes = await Promise.all(points.slice(0, -1).map(async (origin, index) => {
    const query = new URLSearchParams({ key, origin: asAmapPoint(origin), destination: asAmapPoint(points[index + 1]), output: "json" });
    // v3 步行接口会返回每一步的 polyline；v5 目前仅返回文字指引，无法绘制真实步道。
    const response = await fetchMapService(`https://restapi.amap.com/v3/direction/walking?${query.toString()}`);
    if (!response.ok) throw new Error("高德步行路线服务暂时不可用");
    const data = (await response.json()) as AmapResponse;
    const path = data.route?.paths?.[0];
    const polyline = (path?.steps ?? []).flatMap((step) => parsePolyline(step.polyline));
    if (data.status !== "1" || !path || polyline.length < 2) throw new Error(data.info || "高德未返回景区步行轨迹");
    return { distanceMeters: Number(path.distance ?? 0), durationSeconds: Number(path.cost?.duration ?? path.duration ?? 0), polyline };
  }));
  const route = {
    distanceMeters: routes.reduce((total, item) => total + item.distanceMeters, 0),
    durationSeconds: routes.reduce((total, item) => total + item.durationSeconds, 0),
    polyline: routes.flatMap((item) => item.polyline),
  };
  try {
    return { ...route, staticMapDataUrl: await createStaticMap(route.polyline, points, "walking") };
  } catch {
    return route;
  }
}

/**
 * 今日景点「点位图」降级源：高德静态路网图 + 编号标注（不画路线）。
 * 当腾讯卫星图（免费 key 每日额度有限）不可用时，仍能给出真实地图上的点位标记。
 */
export async function getAmapMarkerMap(points: AmapPoint[]): Promise<AmapDrivingRoute> {
  if (points.length < 1 || points.length > 10) throw new Error("点位地图需要 1—10 个定位点");
  return { distanceMeters: 0, durationSeconds: 0, polyline: [], staticMapDataUrl: await createMarkerMap(points) };
}

async function createMarkerMap(points: AmapPoint[]): Promise<string> {
  const key = process.env.AMAP_KEY?.trim();
  if (!key) throw new Error("未配置高德 Web 服务 Key");
  const toLocation = (point: AmapPoint) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;
  const stops = samplePoints(points, 10);
  const markers = stops.map((point, index) => `mid,0x1F4A5E,${index + 1}:${toLocation(point)}`).join("|");
  const labels = stops.map((point, index) => `D${index + 1},0,1,12,0x1F4A5E,0xFFFFFF:${toLocation(point)}`).join("|");
  const query = new URLSearchParams({ key, size: "750*300", scale: "2", markers, labels });
  const response = await fetchMapService(`https://restapi.amap.com/v3/staticmap?${query.toString()}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/")) throw new Error("高德静态地图暂时不可用");
  return `data:${contentType};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
}

function parsePolyline(raw?: string): AmapPoint[] {
  if (!raw) return [];
  return raw.split(";").flatMap((value) => {
    const [lng, lat] = value.split(",").map(Number);
    return Number.isFinite(lng) && Number.isFinite(lat) ? [{ lng, lat }] : [];
  });
}

/**
 * 高德静态地图：将真实道路轨迹、日程节点和景点名称直接渲染成地图底图。
 * 结果转为 data URL 再返回，避免把高德 Key 写进客户端可见的图片地址。
 */
async function createStaticMap(polyline: AmapPoint[], stops: AmapPoint[], mode: "driving" | "walking"): Promise<string> {
  const key = process.env.AMAP_KEY?.trim();
  if (!key) throw new Error("未配置高德 Web 服务 Key");
  const toLocation = (point: AmapPoint) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;
  const sampledLine = samplePoints(polyline, 150).map(toLocation).join(";");
  const visibleStops = samplePoints(stops, 10);
  const markers = visibleStops
    .map((point, index) => `mid,0x1F4A5E,${index + 1}:${toLocation(point)}`)
    .join("|");
  const labels = visibleStops
    .map((point, index) => `D${index + 1},0,1,12,0x1F4A5E,0xFFFFFF:${toLocation(point)}`)
    .join("|");
  const query = new URLSearchParams({
    key,
    size: "750*300",
    scale: "1",
    traffic: "0",
    markers,
    labels,
    paths: `8,${mode === "walking" ? "0x3F7A52" : "0x2386D9"},1,,:${sampledLine}`,
  });
  const response = await fetchMapService(`https://restapi.amap.com/v3/staticmap?${query.toString()}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/")) throw new Error("高德静态地图暂时不可用");
  const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

async function fetchMapService(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    } catch (error) {
      lastError = error;
    }
  }
  // Node/代理的底层 “fetch failed” 对用户没有帮助，统一成可理解且可在前端降级的错误。
  throw new Error(lastError instanceof Error && lastError.name === "TimeoutError"
    ? "地图服务响应超时，请稍后重试"
    : "地图服务网络连接异常，请稍后重试");
}

function samplePoints<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  return Array.from({ length: max }, (_, index) => points[Math.round((index * (points.length - 1)) / (max - 1))]);
}
