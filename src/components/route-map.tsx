"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CarFront, Footprints, LoaderCircle, MapPinned } from "lucide-react";
import { formatDuration, type RouteLeg } from "@/lib/poi";
import { cn } from "@/lib/utils";

type Point = { lng: number; lat: number };
type AmapRoute = { distanceMeters: number; durationSeconds: number; polyline: Point[]; staticMapDataUrl?: string; style?: "satellite" | "roadmap" };

export interface RouteMapNode {
  day: number;
  label: string;
  location?: Point;
  status?: "done" | "current" | "upcoming";
}

/**
 * 导游端路线图：有导游会话时向服务端请求高德驾车规划，按道路 polyline 绘制。
 * 无会话、无 Key 或服务失败时保留本团定位示意，绝不伪造真实路线。
 */
export function RouteMap({
  nodes,
  legs,
  compact,
  tourCode,
  routePoints,
  mode = "driving",
}: {
  nodes: RouteMapNode[];
  legs: RouteLeg[];
  compact?: boolean;
  /** 仅导游端传入；服务端使用导游 Cookie 守卫高德请求。 */
  tourCode?: string;
  /** 每个日程节点的经纬度，按行程顺序作为高德途经点。 */
  routePoints?: Point[];
  /** 景区之间用驾车；景区内部使用高德步行路线；markers＝今日景点卫星点位图（腾讯）。 */
  mode?: "driving" | "walking" | "markers";
}) {
  // 关键：用坐标“内容”生成稳定 key 再驱动算路请求。否则父级（导游端每 2 秒轮询）重渲染时
  // routePoints/nodes 会变成新的数组引用，useMemo 会重新计算 routeInput，使 effect 不断
  // abort 并重新发高德请求，导致「正在生成高德道路行程图…」一直转。
  const rawRoutePoints = routePoints ?? nodes.flatMap((node) => (node.location ? [node.location] : []));
  const routeKey = rawRoutePoints.map((point) => `${point.lng},${point.lat}`).join("|");
  const routeInput = useMemo(
    () => compactRoutePoints(rawRoutePoints),
    // 只用「内容 key」作依赖：内容不变则复用同一引用，避免父级（2 秒轮询）重渲染时重发高德请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeKey]
  );
  const isMarkers = mode === "markers";
  const minPoints = isMarkers ? 1 : 2;
  // 结果与 key 绑定：只有“当前 key”的结果才展示，切换路线时自动回到加载态，
  // 不用在 effect 里同步 setState（也避免把上一次的旧路线闪一下）。
  const [routeState, setRouteState] = useState<{ key: string; route?: AmapRoute; error?: string } | null>(null);
  const amapRoute: AmapRoute | undefined = routeState && routeState.key === routeKey ? routeState.route : undefined;
  const routeError = routeState && routeState.key === routeKey ? (routeState.error ?? "") : "";

  useEffect(() => {
    if (!tourCode || routeInput.length < minPoints) return;
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const loadRoute = async (attempt = 0) => {
      try {
        const response = await fetch("/api/amap/route", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tourCode, points: routeInput, mode }),
          signal: controller.signal,
        });
        const contentType = response.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
          ? await response.json() as { route?: AmapRoute; error?: string }
          : undefined;
        if (!response.ok || !data?.route) throw new Error(data?.error || "地图路线服务暂时不可用");
        setRouteState({ key: routeKey, route: data.route });
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        // 移动网络偶发断流时自动重试一次，不把浏览器底层的 “fetch failed” 直接暴露给游客。
        if (attempt === 0 && isRetryableRouteError(error)) {
          retryTimer = setTimeout(() => void loadRoute(1), 800);
          return;
        }
        setRouteState({ key: routeKey, error: readableRouteError(error) });
      }
    };

    void loadRoute();
    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [tourCode, routeInput, mode, routeKey, minPoints]);

  const W = 380;
  const H = compact ? 172 : 236;
  const PAD = 32;
  const routeCoords = amapRoute?.polyline.length ? amapRoute.polyline : routeInput;
  const project = useMemo(() => createProjector(routeCoords, W, H, PAD), [routeCoords, H]);
  const nodePoints = nodes.map((node, index) => {
    if (node.location) return project(node.location);
    const t = nodes.length <= 1 ? 0.5 : index / (nodes.length - 1);
    return { x: PAD + t * (W - PAD * 2), y: H / 2 + (index % 2 === 0 ? -14 : 14) };
  });
  const amapPath = amapRoute?.polyline
    .map(project)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div>
      {amapRoute?.staticMapDataUrl ? (
        <div className="relative aspect-[5/2] overflow-hidden rounded-2xl bg-qian-50" role="img" aria-label={isMarkers ? (amapRoute?.style === "satellite" ? "卫星地图今日景点点位" : "地图今日景点点位") : "高德真实地图行程图"}>
          <Image
            src={amapRoute.staticMapDataUrl}
            alt={isMarkers ? (amapRoute?.style === "satellite" ? "卫星底图，已标注今日景点编号点位" : "地图底图，已标注今日景点编号点位") : "高德真实地图底图，已标注行程路线和景点节点"}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      ) : (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-qian-50/70" role="img" aria-label={amapRoute ? "高德真实道路行程图" : "本团行程图"}>
        <g stroke="#d9e9ee" strokeWidth="1">
          {Array.from({ length: 5 }, (_, i) => <line key={`v${i}`} x1={(W / 5) * (i + 0.5)} y1="0" x2={(W / 5) * (i + 0.5)} y2={H} />)}
          {Array.from({ length: 3 }, (_, i) => <line key={`h${i}`} x1="0" y1={(H / 3) * (i + 0.5)} x2={W} y2={(H / 3) * (i + 0.5)} />)}
        </g>

        {mode !== "markers" && (amapPath ? (
          <path d={amapPath} fill="none" stroke={mode === "walking" ? "#3f7a52" : "#2386d9"} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
        ) : (
          nodePoints.slice(0, -1).map((point, index) => {
            const next = nodePoints[index + 1];
            const midX = (point.x + next.x) / 2;
            const midY = (point.y + next.y) / 2 - 18;
            return <path key={index} d={`M ${point.x} ${point.y} Q ${midX} ${midY} ${next.x} ${next.y}`} fill="none" stroke="#265c74" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" opacity="0.75" />;
          })
        ))}

        {nodePoints.map((point, index) => {
          const node = nodes[index];
          const fill = node.status === "done" ? "#3f7a52" : node.status === "upcoming" ? "#8b979c" : "#1f4a5e";
          return (
            <g key={node.day}>
              <circle cx={point.x} cy={point.y} r="12" fill={fill} stroke="#fffdf6" strokeWidth="2.5" />
              <text x={point.x} y={point.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fffdf6">{node.day}</text>
              <text x={point.x} y={point.y + 25} textAnchor="middle" fontSize="9.5" fill="#5c6b72" fontWeight="500">{truncate(node.label, 8)}</text>
            </g>
          );
        })}
      </svg>
      )}

      {tourCode && (
        <p className={cn("flex items-center gap-1.5 text-[11px]", compact ? "mt-2" : "mt-3", amapRoute ? "text-pine-600" : "text-ink-faint")}>
          {amapRoute ? mode === "walking" ? <Footprints className="size-3.5" /> : <MapPinned className="size-3.5" /> : routeError ? <MapPinned className="size-3.5" /> : routeInput.length < minPoints ? <MapPinned className="size-3.5" /> : <LoaderCircle className="size-3.5 animate-spin" />}
          {amapRoute
            ? isMarkers
              ? amapRoute.staticMapDataUrl ? amapRoute.style === "satellite" ? "卫星地图 · 今日景点点位" : "地图 · 今日景点点位" : "今日景点点位图"
              : amapRoute.staticMapDataUrl ? mode === "walking" ? "高德景区步行路线图" : "高德真实地图行程图" : mode === "walking" ? "高德景区步行轨迹" : "高德真实道路行程图"
            : routeError
              ? `${isMarkers ? "点位地图未加载：" : "高德路线未加载："}${routeError}`
              : routeInput.length < minPoints
                ? isMarkers
                  ? "今日景点缺少定位，无法绘制点位图（请给今天的节点选择带坐标的景点）"
                  : "定位节点不足，无法生成高德路线（请给每天的关键节点选择带坐标的景点）"
                : isMarkers ? "正在生成卫星点位图…" : mode === "walking" ? "正在生成高德景区步行路线…" : "正在生成高德道路行程图…"}
        </p>
      )}

      {amapRoute && amapRoute.distanceMeters > 0 && (
        <div className={cn("mt-2 flex items-center gap-2 rounded-xl bg-pine-100/60 px-3 py-2 text-xs text-pine-700", compact ? "" : "mt-3")}>
          {mode === "walking" ? <Footprints className="size-4 shrink-0" /> : <CarFront className="size-4 shrink-0" />}
          <span className="font-medium">高德{mode === "walking" ? "步行" : "推荐"}路线 · {(amapRoute.distanceMeters / 1000).toFixed(1)} 公里 · {formatDuration(Math.ceil(amapRoute.durationSeconds / 60))}</span>
        </div>
      )}

      {!amapRoute && legs.length > 0 && (
        <ul className={cn("space-y-1.5", compact ? "mt-2" : "mt-3")}>
          {legs.map((leg) => (
            <li key={`${leg.fromDay}-${leg.toDay}`} className="flex items-center gap-2 text-xs text-ink-soft">
              <CarFront className="size-4 shrink-0 text-qian-500" />
              <span className="min-w-0 flex-1 truncate">Day {leg.fromDay} → Day {leg.toDay} · {leg.fromPoint} → {leg.toPoint}</span>
              <span className="shrink-0 font-medium text-qian-800">约 {leg.distanceKm} 公里 · {formatDuration(leg.durationMin)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function createProjector(points: Point[], width: number, height: number, padding: number) {
  const valid = points.filter((point) => Number.isFinite(point.lng) && Number.isFinite(point.lat));
  if (!valid.length) return () => ({ x: width / 2, y: height / 2 });
  const lngs = valid.map((point) => point.lng);
  const lats = valid.map((point) => point.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngSpan = Math.max(maxLng - minLng, 0.006);
  const latSpan = Math.max(maxLat - minLat, 0.006);
  return (point: Point) => ({
    x: padding + ((point.lng - minLng) / lngSpan) * (width - padding * 2),
    y: height - padding - ((point.lat - minLat) / latSpan) * (height - padding * 2),
  });
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function isRetryableRouteError(error: unknown) {
  if (!(error instanceof Error)) return true;
  return /fetch|network|load|timeout|temporarily|暂时/i.test(error.message);
}

function readableRouteError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message || /fetch failed|failed to fetch|networkerror|load failed/i.test(message)) {
    return "网络连接异常，已显示行程示意图";
  }
  return message;
}

/** 高德单次驾车算路限制内保留首尾与均匀分布的中间景点，保证路线完整而不截断终点。 */
function compactRoutePoints(points: Point[]): Point[] {
  if (points.length <= 18) return points;
  return Array.from({ length: 18 }, (_, index) => points[Math.round((index * (points.length - 1)) / 17)]);
}
