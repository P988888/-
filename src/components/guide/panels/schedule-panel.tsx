"use client";

import { useState } from "react";
import {
  Pencil,
  Check,
  Navigation,
  CalendarCheck,
  X,
  ImagePlus,
  Footprints,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RouteMap } from "@/components/route-map";
import { ScenicStopsEditor } from "@/components/scenic-stops-editor";
import { planRoute } from "@/lib/poi";
import { formatCnTime, cn } from "@/lib/utils";
import { dayStatus, type TourDay } from "@/lib/demo";
import type { ScenicStop } from "@/lib/demo";
import { updateMeetingInfo } from "@/actions/tour-actions";

/**
 * 行程 Tab（多日团）：按天切换查看与编辑；
 * 「结束今天」后该天自动标记已结束，全团游客端切换到第二天。
 */
export function SchedulePanel({
  days: initialDays,
  tourCode,
  currentDay,
  onAdvanceDay,
}: {
  days: TourDay[];
  tourCode: string;
  currentDay: number;
  onAdvanceDay: () => Promise<void>;
}) {
  const [days, setDays] = useState(initialDays);
  const [selected, setSelected] = useState(currentDay);
  const [editingSeq, setEditingSeq] = useState<number | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editPoint, setEditPoint] = useState("");
  const [editPhoto, setEditPhoto] = useState<string | undefined>();
  const [editScenicStops, setEditScenicStops] = useState<ScenicStop[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saveError, setSaveError] = useState("");

  const day = days.find((d) => d.day === selected) ?? days[0];
  const status = dayStatus(day.day, currentDay);
  const isLastDay = currentDay >= days.length;

  // 全程路线（创建时按 POI 定位自动生成）
  const routeNodes = days.map((d) => ({
    day: d.day,
    label: d.title,
    location: d.stages.find((s) => s.location)?.location,
    status: dayStatus(d.day, currentDay),
  }));
  const routeLegs = planRoute(
    days.map((d) => ({
      day: d.day,
      title: d.title,
      first: {
        point: d.stages[0]?.point ?? "",
        location: d.stages[0]?.location,
      },
      last: {
        point: d.stages[d.stages.length - 1]?.point ?? "",
        location: d.stages[d.stages.length - 1]?.location,
      },
    }))
  );
  // 每个集合/游览节点都作为高德途经点，得到的是实际道路路线，而非日与日之间的直线估算。
  const routePoints = days.flatMap((item) =>
    item.stages.flatMap((stage) => (stage.location ? [stage.location] : []))
  );

  function startEdit(seq: number, time: string, point: string, photo?: string, scenicStops: ScenicStop[] = []) {
    setEditingSeq(seq);
    setEditTime(time);
    setEditPoint(point);
    setEditPhoto(photo);
    setEditScenicStops(scenicStops);
    setSaveError("");
  }

  async function uploadMeetingPhoto(file: File) {
    setSaveError("");
    setUploadingPhoto(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/upload/meeting-photo", { method: "POST", body: data });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "图片上传失败，请重试");
      setEditPhoto(result.url);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "图片上传失败，请重试");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function saveEdit() {
    if (editingSeq === null) return;
    const stage = day.stages.find((item) => item.seq === editingSeq);
    if (stage?.id) {
      const date = new Date(day.date).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
      const result = await updateMeetingInfo({
        tourCode, stageId: stage.id, meetingTime: new Date(`${date}T${editTime}:00+08:00`).toISOString(), meetingPoint: editPoint,
        pointHint: stage.pointHint, photo: editPhoto, scenicStops: editScenicStops,
      });
      if (!result.ok) { setSaveError(result.error); return; }
    }
    setDays((ds) =>
      ds.map((d) =>
        d.day !== day.day
          ? d
          : {
              ...d,
              stages: d.stages.map((s) =>
                s.seq === editingSeq ? { ...s, point: editPoint, photo: editPhoto, scenicStops: editScenicStops } : s
              ),
            }
      )
    );
    setSaveError("");
    setEditingSeq(null);
  }

  async function advance() {
    await onAdvanceDay();
    setSelected(Math.min(currentDay + 1, days.length));
    setEditingSeq(null);
  }

  return (
    <section aria-label="行程与集合" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">行程与集合</h2>
        <span className="text-xs text-ink-faint">
          共 {days.length} 天 · 今天 Day {currentDay}
        </span>
      </div>

      {/* 全程路线规划 */}
      <Card className="p-4">
        <h3 className="mb-2.5 text-sm font-semibold text-ink">全程路线规划</h3>
        <RouteMap
          nodes={routeNodes}
          legs={routeLegs}
          compact
          tourCode={tourCode}
          routePoints={routePoints}
        />
      </Card>

      {/* 日期选择条 */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const st = dayStatus(d.day, currentDay);
          const active = selected === d.day;
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => {
                setSelected(d.day);
                setEditingSeq(null);
              }}
              className={cn(
                "flex w-[76px] shrink-0 flex-col items-center rounded-2xl border px-2 py-2.5 transition-all active:scale-95",
                active
                  ? "border-qian-700 bg-qian-700 text-white shadow-card"
                  : st === "done"
                    ? "border-moss-600/25 bg-moss-100/60 text-moss-700"
                    : "border-qian-100/80 bg-card text-ink-soft"
              )}
            >
              <span className="text-[10px] font-medium opacity-80">
                Day {d.day}
              </span>
              <span className="mt-0.5 text-xs font-bold">
                {formatShortDate(d.date)}
              </span>
              <span
                className={cn(
                  "mt-1 rounded-full px-1.5 py-px text-[9px] font-medium",
                  active
                    ? "bg-white/20 text-white"
                    : st === "done"
                      ? "bg-moss-600/10 text-moss-700"
                      : st === "current"
                        ? "bg-qian-100 text-qian-700"
                        : "bg-qian-50 text-ink-faint"
                )}
              >
                {st === "done" ? "已结束" : st === "current" ? "今天" : "未开始"}
              </span>
            </button>
          );
        })}
      </div>

      {/* 选中的那一天 */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold">
            Day {day.day} · {day.title}
          </h3>
          {status === "current" && (
            <Badge variant="solid" className="shrink-0">
              <Navigation className="size-3" /> 进行中
            </Badge>
          )}
          {status === "done" && (
            <Badge variant="moss" className="shrink-0">
              <Check className="size-3" /> 已结束
            </Badge>
          )}
        </div>

        <ol>
          {day.stages.map((s, i) => {
            const editing = editingSeq === s.seq;
            return (
              <li key={s.seq} className="relative flex gap-3 pb-4 last:pb-0">
                {i < day.stages.length - 1 && (
                  <span className="absolute left-[11px] top-6 h-[calc(100%-20px)] w-0.5 rounded-full bg-qian-100" />
                )}
                <span
                  className={cn(
                    "z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    status === "done"
                      ? "bg-moss-100 text-moss-700"
                      : s.isCurrent && status === "current"
                        ? "bg-qian-700 text-white"
                        : "bg-qian-50 text-ink-faint"
                  )}
                >
                  {status === "done" ? <Check className="size-3.5" /> : s.seq}
                </span>

                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="space-y-2">
                      <Input
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="h-10 text-sm"
                        aria-label="集合时间"
                      />
                      <Input
                        value={editPoint}
                        onChange={(e) => setEditPoint(e.target.value)}
                        className="h-10 text-sm"
                        aria-label="集合地点"
                      />
                      <ScenicStopsEditor stops={editScenicStops} onChange={setEditScenicStops} />
                      <div className="flex items-center gap-2.5">
                        {editPhoto ? (
                          <div className="relative">
                            <img
                              src={editPhoto}
                              alt="集合点照片预览"
                              className="h-16 w-24 rounded-xl border border-qian-100 object-cover"
                            />
                            <button
                              type="button"
                              aria-label="移除集合点照片"
                              onClick={() => setEditPhoto(undefined)}
                              className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-card shadow-card"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className={cn("flex h-16 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-qian-300 bg-qian-50/60 text-qian-600 transition hover:bg-qian-50", uploadingPhoto && "cursor-wait opacity-60")}>
                            <ImagePlus className="size-4.5" />
                            <span className="text-[10px]">{uploadingPhoto ? "上传中…" : "集合点照片"}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingPhoto}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void uploadMeetingPhoto(file);
                                event.currentTarget.value = "";
                              }}
                            />
                          </label>
                        )}
                        <p className="text-[11px] leading-relaxed text-ink-faint">
                          这张图会显示在游客端的集合卡，方便游客现场辨认位置。
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={uploadingPhoto} onClick={() => void saveEdit()}>
                          <Check className="size-3.5" /> 保存并同步全团
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingSeq(null)}
                        >
                          <X className="size-3.5" /> 取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-sm leading-tight",
                            status === "done"
                              ? "text-ink-faint line-through decoration-qian-200"
                              : s.isCurrent && status === "current"
                                ? "font-semibold text-qian-800"
                                : "text-ink-soft"
                          )}
                        >
                          {s.name}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {formatCnTime(s.meetingTime)} · {s.point}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-faint">
                          {s.pointHint}
                        </p>
                        {(s.scenicStops?.length ?? 0) > 0 && (
                          <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-pine-700">
                            <Footprints className="size-3.5 shrink-0" />
                            景区内步行：{s.scenicStops?.map((stop) => stop.name).join(" → ")}
                          </p>
                        )}
                      </div>
                      {status !== "done" && (
                        <button
                          type="button"
                          aria-label={`编辑${s.name}`}
                          onClick={() =>
                            startEdit(s.seq, formatCnTime(s.meetingTime), s.point, s.photo, s.scenicStops)
                          }
                          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-qian-600 hover:bg-qian-50"
                        >
                          <Pencil className="size-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 border-t border-qian-100/70 pt-2.5 text-[11px] text-ink-faint">
          修改保存后 2 秒内同步全团游客端，并标注「导游刚刚更新」
        </p>
        {saveError && <p role="alert" className="mt-2 text-xs text-cinnabar-700">{saveError}</p>}
      </Card>

      {/* 结束今天 → 明天 */}
      {status === "current" && !isLastDay && (
        <Card className="border-pine-500/30 bg-pine-100/40 p-4">
          <div className="flex items-start gap-3">
            <CalendarCheck className="mt-0.5 size-5 shrink-0 text-pine-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">今天的行程结束了？</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                Day {day.day} 将标记「已结束」，全团游客端自动切换到 Day{" "}
                {day.day + 1} ·{" "}
                {days.find((d) => d.day === day.day + 1)?.title}
              </p>
              <Button
                variant="pine"
                size="lg"
                className="mt-3 w-full"
                onClick={() => void advance()}
              >
                结束今天，进入 Day {day.day + 1}
              </Button>
            </div>
          </div>
        </Card>
      )}
      {status === "current" && isLastDay && (
        <Card className="border-moss-600/25 bg-moss-100/50 p-4">
          <p className="text-center text-sm text-moss-700">
            这是行程最后一天，结束后全团故事卡将可以生成
          </p>
        </Card>
      )}
    </section>
  );
}

function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
  });
}
