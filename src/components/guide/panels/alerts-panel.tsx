"use client";

import {
  AlarmClock,
  Compass,
  HeartPulse,
  LifeBuoy,
  PhoneCall,
  CheckCheck,
  CircleCheck,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCnTime, cn } from "@/lib/utils";
import type { GuideAlert } from "@/lib/demo";

const alertIcon = {
  delay: AlarmClock,
  lost: Compass,
  health: HeartPulse,
  help: LifeBuoy,
} as const;

const alertLabel = {
  delay: "可能迟到",
  lost: "迷路 / 走错",
  health: "身体不适",
  help: "其他求助",
} as const;

/** 异常队列 —— 红色只给待处理异常 */
export function AlertsPanel({
  alerts,
  guidePhone,
  onAcknowledge,
  onResolve,
}: {
  alerts: GuideAlert[];
  guidePhone: string;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}) {
  const openCount = alerts.filter((a) => a.status === "open").length;
  const visible = alerts.filter((a) => a.status !== "resolved");

  return (
    <section aria-label="待处理异常" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">异常队列</h2>
        {openCount > 0 ? (
          <Badge variant="cinnabar">{openCount} 条待办</Badge>
        ) : (
          <Badge variant="moss">
            <CircleCheck className="size-3.5" /> 全部已处理
          </Badge>
        )}
      </div>

      {visible.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <ShieldCheck className="size-8 text-moss-600" />
          <p className="font-display text-[15px] font-semibold">此刻没有异常</p>
          <p className="text-xs leading-relaxed text-ink-faint">
            游客的迟到、迷路、不适、求助会在这里出现，
            <br />
            普通咨询阿黔已经替你答掉了。
          </p>
        </Card>
      )}

      {visible.map((a) => {
        const Icon = alertIcon[a.type];
        const open = a.status === "open";
        return (
          <Card
            key={a.id}
            className={cn(
              "p-4",
              open
                ? "alert-pulse border-cinnabar-500/50 bg-cinnabar-50/70"
                : "border-pine-500/30 bg-pine-100/40"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-2xl text-white",
                  open ? "bg-cinnabar-600" : "bg-pine-500"
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">
                    {a.memberNickname} · {alertLabel[a.type]}
                  </p>
                  <span className="text-[11px] text-ink-faint">
                    {formatCnTime(a.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                  {a.summary}
                </p>
                <p className="mt-1 text-xs text-ink-faint">地标：{a.landmark}</p>

                {a.guideResponse && (
                  <p className="mt-2 rounded-xl bg-card px-3 py-2 text-[13px] text-ink">
                    您的回复：{a.guideResponse}
                    <span className="mt-0.5 block text-[11px] text-moss-600">
                      ✓ 已回传游客端
                    </span>
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  {open ? (
                    <>
                      <Button
                        variant="cinnabar"
                        size="lg"
                        className="flex-1"
                        onClick={() => onAcknowledge(a.id)}
                      >
                        <CheckCheck className="size-4.5" />
                        已联系，原地等候
                      </Button>
                      <a href={`tel:${guidePhone.replace(/\s/g, "")}`}>
                        <Button
                          variant="outline"
                          size="lg"
                          className="border-cinnabar-500/40 text-cinnabar-700"
                          aria-label="拨打游客电话"
                        >
                          <PhoneCall className="size-4.5" />
                        </Button>
                      </a>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full"
                      onClick={() => onResolve(a.id)}
                    >
                      <CircleCheck className="size-4" />
                      标记已解决
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
