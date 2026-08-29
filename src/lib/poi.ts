/**
 * POI 定位适配层 —— 高德地图 Web 服务
 *
 * 生产实现（后端预留，见 INTEGRATION_CHECKLIST §2.2.5）：
 *   GET /api/poi/search?keywords=黄果树瀑布
 *   → 服务端代理高德 https://restapi.amap.com/v3/place/text
 *     （key=AMAP_KEY 仅服务端，city=贵州，返回 poi 列表）
 * 搜索由 `/api/poi/search` 服务端代理高德 place/text，Key 仅保存在服务端。
 */

export interface Poi {
  id: string;
  name: string;
  address: string;
  /** 高德 GCJ-02 坐标 */
  location: { lng: number; lat: number };
  /** 示例集合点照片（public/demo/） */
  photo?: string;
}

/** 早期演示数据保留为模板参考；地点搜索不会使用这份预设数据。 */
export const guizhouPois: Poi[] = [
  {
    id: "poi-qy-north",
    name: "青岩古镇北门城楼",
    address: "贵州省贵阳市花溪区青岩古镇北街入口",
    location: { lng: 106.6872, lat: 26.3368 },
    photo: "/demo/qingyan-gate.svg",
  },
  {
    id: "poi-qy-ciyun",
    name: "慈云寺广场 · 石牌坊",
    address: "贵州省贵阳市花溪区青岩古镇慈云寺前",
    location: { lng: 106.6891, lat: 26.3349 },
    photo: "/demo/ciyun-square.svg",
  },
  {
    id: "poi-qy-parking",
    name: "青岩古镇北门停车场",
    address: "贵州省贵阳市花溪区青岩古镇北门东侧",
    location: { lng: 106.6878, lat: 26.3381 },
    photo: "/demo/qingyan-gate.svg",
  },
  {
    id: "poi-hgs-falls",
    name: "黄果树大瀑布",
    address: "贵州省安顺市镇宁布依族苗族自治县黄果树景区",
    location: { lng: 105.6713, lat: 25.9814 },
    photo: "/demo/huangguoshu.svg",
  },
  {
    id: "poi-hgs-view",
    name: "观瀑台 · 水帘洞入口",
    address: "黄果树大瀑布景区观瀑台",
    location: { lng: 105.6721, lat: 25.9802 },
    photo: "/demo/huangguoshu.svg",
  },
  {
    id: "poi-hgs-parking",
    name: "黄果树景区停车场",
    address: "黄果树景区游客服务中心旁",
    location: { lng: 105.6745, lat: 25.9841 },
  },
  {
    id: "poi-qls-hongfu",
    name: "弘福寺前广场",
    address: "贵州省贵阳市云岩区黔灵山公园弘福寺",
    location: { lng: 106.6968, lat: 26.6059 },
    photo: "/demo/qianling.svg",
  },
  {
    id: "poi-qls-gate",
    name: "黔灵山公园南大门",
    address: "贵州省贵阳市云岩区枣山路 187 号",
    location: { lng: 106.6993, lat: 26.6012 },
    photo: "/demo/qianling.svg",
  },
  {
    id: "poi-gy-hotel",
    name: "贵阳饭店大堂",
    address: "贵州省贵阳市云岩区中华北路 3 号",
    location: { lng: 106.7132, lat: 26.5786 },
  },
  {
    id: "poi-gy-north-station",
    name: "贵阳北站东进站口",
    address: "贵州省贵阳市观山湖区贵阳北站",
    location: { lng: 106.6715, lat: 26.6197 },
  },
  {
    id: "poi-xijiang",
    name: "西江千户苗寨观景台",
    address: "贵州省黔东南州雷山县西江千户苗寨",
    location: { lng: 108.1752, lat: 26.4913 },
  },
  {
    id: "poi-xiaoqikong",
    name: "荔波小七孔古桥",
    address: "贵州省黔南州荔波县小七孔景区",
    location: { lng: 107.7188, lat: 25.2731 },
  },
  {
    id: "poi-fanjing",
    name: "梵净山红云金顶",
    address: "贵州省铜仁市江口县梵净山景区",
    location: { lng: 108.7008, lat: 27.9057 },
  },
];

/**
 * POI 搜索：只返回高德真实检索结果。接口异常交给 UI 明确提示，
 * 不回退到系统预设地点，以免导游误把演示坐标当成真实位置。
 */
export async function searchPoi(keyword: string): Promise<Poi[]> {
  if (!keyword.trim()) return [];
  const response = await fetch(`/api/poi/search?q=${encodeURIComponent(keyword.trim())}`);
  const data = (await response.json()) as { pois?: Poi[]; error?: string };
  if (!response.ok) throw new Error(data.error ?? "高德地点搜索暂时不可用");
  return data.pois ?? [];
}

/* ——— 路线规划（演示实现） ———
 * 生产实现：服务端代理高德 /v3/direction/driving 逐段求距，
 * 或 /v4/staticmap 出静态路线图。此处用 POI 坐标算里程演示。
 */

export interface RouteLeg {
  fromDay: number;
  toDay: number;
  fromPoint: string;
  toPoint: string;
  distanceKm: number;
  durationMin: number;
}

export interface RouteNode {
  day: number;
  title: string;
  point: string;
  location?: { lng: number; lat: number };
}

function haversineKm(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * 相邻两天：取前一天最后一个节点 → 后一天第一个节点生成一段车程。
 * 公路里程 ≈ 直线 × 1.35（贵州山区系数），车速按 55km/h 估。
 */
export function planRoute(
  days: { day: number; title: string; first: { point: string; location?: { lng: number; lat: number } }; last: { point: string; location?: { lng: number; lat: number } } }[]
): RouteLeg[] {
  const legs: RouteLeg[] = [];
  for (let i = 0; i < days.length - 1; i++) {
    const from = days[i].last;
    const to = days[i + 1].first;
    if (!from.location || !to.location) continue;
    const distanceKm = Math.round(haversineKm(from.location, to.location) * 1.35);
    legs.push({
      fromDay: days[i].day,
      toDay: days[i + 1].day,
      fromPoint: from.point,
      toPoint: to.point,
      distanceKm,
      durationMin: Math.max(20, Math.round((distanceKm / 55) * 60)),
    });
  }
  return legs;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} 分钟`;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
}
