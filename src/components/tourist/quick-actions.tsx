"use client";

import { Clock3, MapPin, BookOpen, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickActionKey = "meeting" | "facility" | "story" | "help";

/**
 * 四个大按钮 —— 文字+大按钮是主链路，不依赖语音。
 * 「我需要帮助」用朱砂红，是唯一通往真人导游的入口。
 * currentPoint 是「当前所在节点」的实时点位（随导游更新行程/结束当天而变化）。
 */
export function QuickActions({
  onAction,
  currentPoint,
}: {
  onAction: (key: QuickActionKey) => void;
  currentPoint?: string;
}) {
  const items: {
    key: QuickActionKey;
    icon: typeof Clock3;
    label: string;
    sub: string;
    danger?: boolean;
  }[] = [
    { key: "meeting", icon: Clock3, label: "几点集合", sub: "时间地点" },
    { key: "facility", icon: MapPin, label: "附近服务", sub: "洗手间·饮水" },
    { key: "story", icon: BookOpen, label: "听当前故事", sub: currentPoint ? currentPoint : "正在定位…" },
    {
      key: "help",
      icon: HeartHandshake,
      label: "我需要帮助",
      sub: "直达周导",
      danger: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onAction(it.key)}
          className={cn(
            "flex min-h-[76px] items-center gap-3 rounded-3xl border p-3.5 text-left shadow-card transition-all active:scale-[0.97]",
            it.danger
              ? "border-cinnabar-500/40 bg-cinnabar-50 hover:bg-cinnabar-100"
              : "border-qian-100/80 bg-card hover:bg-qian-50"
          )}
        >
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl",
              it.danger
                ? "bg-cinnabar-600 text-white"
                : "bg-qian-700 text-white"
            )}
          >
            <it.icon className="size-5" strokeWidth={1.9} />
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                "block text-[15px] font-semibold",
                it.danger ? "text-cinnabar-700" : "text-ink"
              )}
            >
              {it.label}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
              {it.sub}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
