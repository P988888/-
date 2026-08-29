"use client";

import {
  BellRing,
  Users,
  Map,
  ChartColumn,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type GuideTab = "alerts" | "members" | "schedule" | "insights" | "settings";

const tabs: { key: GuideTab; label: string; icon: typeof BellRing }[] = [
  { key: "alerts", label: "异常", icon: BellRing },
  { key: "members", label: "成员", icon: Users },
  { key: "schedule", label: "行程", icon: Map },
  { key: "insights", label: "数据", icon: ChartColumn },
  { key: "settings", label: "设置", icon: Settings2 },
];

/** 导游端底部导航：红色只给「异常」 Tab 的待办角标 */
export function GuideTabBar({
  active,
  onChange,
  alertCount,
}: {
  active: GuideTab;
  onChange: (tab: GuideTab) => void;
  alertCount: number;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px]">
      <div className="grid grid-cols-5 border-t border-qian-100 bg-card/95 backdrop-blur pb-safe">
        {tabs.map((t) => {
          const isActive = active === t.key;
          const isAlert = t.key === "alerts";
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={cn(
                "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 transition-colors",
                isActive
                  ? isAlert && alertCount > 0
                    ? "text-cinnabar-600"
                    : "text-qian-700"
                  : "text-ink-faint"
              )}
              aria-label={t.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="relative">
                <t.icon
                  className="size-5"
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {isAlert && alertCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cinnabar-600 px-1 text-[10px] font-bold text-white">
                    {alertCount}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  isActive ? "font-semibold" : "font-normal"
                )}
              >
                {t.label}
              </span>
              {isActive && (
                <span
                  className={cn(
                    "absolute top-0 h-0.5 w-8 rounded-full",
                    isAlert && alertCount > 0 ? "bg-cinnabar-600" : "bg-qian-700"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
