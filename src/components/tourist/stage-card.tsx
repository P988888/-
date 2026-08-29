"use client";

import { useState } from "react";
import { Check, Navigation, ChevronDown, Route, Footprints } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RouteMap } from "@/components/route-map";
import { formatCnTime, cn } from "@/lib/utils";
import { dayStatus, type Stage, type TourDay } from "@/lib/demo";

/**
 * 全程行程卡（多日团）：
 * 已结束的天收起并打「已结束」标；今天展开显示节点；
 * 未来的天灰显日期。点击任意天可展开查看。
 */
export function StageCard({
  days,
  currentDay,
  tourCode,
}: {
  days: TourDay[];
  currentDay: number;
  /** 已进团游客可读取同一团的路线底图。 */
  tourCode?: string;
}) {
  const [expanded, setExpanded] = useState<number>(currentDay);

  // 今日点位：只画「今天」这一天的景点，不把多日全程连成一条跨越数百公里的线。
  const today = days.find((d) => d.day === currentDay) ?? days[0];
  const routeNodes = today.stages
    .filter((s) => s.location)
    .map((s, index) => ({
      day: index + 1,
      label: s.point || s.name,
      location: s.location,
      status: "current" as const,
    }));
  const routePoints = today.stages.flatMap((stage) => (stage.location ? [stage.location] : []));

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[15px] font-semibold">全程行程</h2>
        <span className="text-xs text-ink-faint">
          共 {days.length} 天 · 今天 Day {currentDay}
        </span>
      </div>

      {tourCode && (
        <div className="mb-4 rounded-2xl border border-qian-100 bg-qian-50/40 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-qian-700">
            <Route className="size-4" />
            今日景点路线
            <span className="font-normal text-ink-faint">· 高德道路行程</span>
          </div>
          <RouteMap
            nodes={routeNodes}
            legs={[]}
            compact
            tourCode={tourCode}
            routePoints={routePoints}
            mode="driving"
          />
        </div>
      )}

      <div className="space-y-2">
        {days.map((d) => {
          const status = dayStatus(d.day, currentDay);
          const open = expanded === d.day;
          return (
            <div
              key={d.day}
              className={cn(
                "overflow-hidden rounded-2xl border transition-colors",
                status === "current"
                  ? "border-qian-200 bg-qian-50/50"
                  : "border-qian-100/70 bg-card"
              )}
            >
              <button
                type="button"
                onClick={() => setExpanded(open ? -1 : d.day)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-bold leading-none",
                    status === "done" && "bg-moss-100 text-moss-700",
                    status === "current" && "bg-qian-700 text-white",
                    status === "upcoming" && "bg-qian-50 text-ink-faint"
                  )}
                >
                  <span className="text-[9px] font-medium opacity-80">Day</span>
                  {d.day}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm",
                      status === "current"
                        ? "font-semibold text-qian-800"
                        : status === "done"
                          ? "text-ink-soft"
                          : "text-ink-faint"
                    )}
                  >
                    {d.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-faint">
                    {formatDayDate(d.date)}
                  </span>
                </span>
                {status === "done" && (
                  <Badge variant="moss" className="shrink-0">
                    <Check className="size-3" />
                    已结束
                  </Badge>
                )}
                {status === "current" && (
                  <Badge variant="solid" className="shrink-0">
                    <Navigation className="size-3" />
                    今天
                  </Badge>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-ink-faint transition-transform",
                    open && "rotate-180"
                  )}
                />
              </button>

              {open && (
                <ol className="border-t border-qian-100/60 px-3.5 pb-3 pt-2.5">
                  {d.stages.map((s, i) => (
                    <StageRow
                      key={s.seq}
                      stage={s}
                      isLast={i === d.stages.length - 1}
                      dayDone={status === "done"}
                      dimmed={status === "upcoming"}
                      tourCode={tourCode}
                    />
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
        每天行程自动同步；当天结束后自动标记「已结束」，并为你切换到第二天的安排。
      </p>
    </Card>
  );
}

function StageRow({
  stage,
  isLast,
  dayDone,
  dimmed,
  tourCode,
}: {
  stage: Stage;
  isLast: boolean;
  dayDone: boolean;
  dimmed: boolean;
  tourCode?: string;
}) {
  const done = dayDone;
  const current = !dayDone && stage.isCurrent;
  return (
    <li className="relative flex gap-3 pb-3.5 last:pb-0.5">
      {!isLast && (
        <span
          className={cn(
            "absolute left-[11px] top-6 h-[calc(100%-20px)] w-0.5 rounded-full",
            done ? "bg-moss-600/40" : "bg-qian-100"
          )}
        />
      )}
      <span
        className={cn(
          "z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          done && "bg-moss-100 text-moss-700",
          current && "bg-qian-700 text-white shadow-card",
          !done && !current && "bg-qian-50 text-ink-faint"
        )}
      >
        {done ? <Check className="size-3.5" /> : stage.seq}
      </span>
      <div className={cn("min-w-0 flex-1", dimmed && "opacity-60")}>
        <p
          className={cn(
            "text-sm leading-tight",
            current ? "font-semibold text-qian-800" : "text-ink-soft",
            done && "text-ink-faint line-through decoration-qian-200"
          )}
        >
          {stage.name}
          {current && (
            <span className="ml-1.5 rounded-full bg-qian-50 px-1.5 py-0.5 text-[10px] font-medium text-qian-600">
              进行中
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {formatCnTime(stage.meetingTime)} · {stage.point}
        </p>
        {(stage.scenicStops?.length ?? 0) > 0 && (
          <ScenicWalkRoute stage={stage} tourCode={tourCode} />
        )}
      </div>
    </li>
  );
}

/** 景区内部线路独立呈现：从导游设置的集合点步行依次游览各景点。 */
function ScenicWalkRoute({ stage, tourCode }: { stage: Stage; tourCode?: string }) {
  const stops = stage.scenicStops ?? [];
  const routePoints = [stage.location, ...stops.map((stop) => stop.location)].filter(
    (point): point is { lng: number; lat: number } => Boolean(point)
  );
  const nodes = [
    { day: 1, label: stage.point, location: stage.location },
    ...stops.map((stop, index) => ({ day: index + 2, label: stop.name, location: stop.location })),
  ];
  return (
    <div className="mt-3 rounded-xl border border-pine-500/20 bg-pine-100/35 p-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-pine-800">
        <Footprints className="size-3.5" /> 景区内游览 · 步行
      </p>
      <ol className="mt-2 flex flex-wrap gap-1.5">
        {stops.map((stop, index) => (
          <li key={`${stop.name}-${index}`} className="rounded-lg bg-card/80 px-2 py-1 text-[10px] text-pine-800">
            {index + 1}. {stop.name}
          </li>
        ))}
      </ol>
      {tourCode && routePoints.length >= 2 && (
        <div className="mt-2.5">
          <RouteMap nodes={nodes} legs={[]} compact tourCode={tourCode} routePoints={routePoints} mode="walking" />
        </div>
      )}
    </div>
  );
}

function formatDayDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}
