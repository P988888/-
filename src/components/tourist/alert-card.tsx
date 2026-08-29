"use client";

import { useState } from "react";
import {
  AlarmClock,
  Compass,
  HeartPulse,
  LifeBuoy,
  Send,
  MapPin,
  PhoneCall,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAlert } from "@/actions/alert-actions";
import { type GuideAlert } from "@/lib/demo";

/**
 * 异常操作卡 —— 识别到迟到/迷路/不适/求助时，停止闲聊，
 * 显示「阿黔将把这件事交给真人导游」。
 * 状态必须图标+文字，不能只靠红色。
 */

type AlertType = "delay" | "lost" | "health" | "help";
type Phase = "pick" | "confirm" | "waiting" | "done";

const typeMeta: Record<
  AlertType,
  { icon: typeof AlarmClock; label: string; hint: string; summary: string }
> = {
  delay: {
    icon: AlarmClock,
    label: "可能迟到",
    hint: "赶不上集合时间",
    summary: "「我可能无法按时到达集合点」",
  },
  lost: {
    icon: Compass,
    label: "迷路 / 走错",
    hint: "找不到集合点",
    summary: "「我找不到集合点的位置」",
  },
  health: {
    icon: HeartPulse,
    label: "身体不适",
    hint: "累了、不舒服",
    summary: "「我身体有些不舒服，需要休息」",
  },
  help: {
    icon: LifeBuoy,
    label: "其他求助",
    hint: "其他需要真人的事",
    summary: "「我有一件事需要导游帮助」",
  },
};

export function AlertCard({
  tourCode,
  guideName,
  guidePhone,
  myAlerts,
  onClose,
}: {
  tourCode: string;
  guideName: string;
  guidePhone: string;
  /** 本团状态 2 秒轮询：导游确认后这里会带出最新状态与回复 */
  myAlerts?: GuideAlert[];
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [type, setType] = useState<AlertType>("delay");
  const [shareLocation, setShareLocation] = useState(false);
  const [error, setError] = useState("");
  const [createdAlertId, setCreatedAlertId] = useState<string | null>(null);

  // 导游一确认，状态同步就把这个求助推回「已确认并回复」。直接在渲染时读取轮询结果。
  const ackAlert = createdAlertId ? myAlerts?.find((x) => x.id === createdAlertId) : undefined;
  const acknowledged = !!(ackAlert && (ackAlert.status === "acknowledged" || ackAlert.status === "resolved"));

  async function submit() {
    setError("");
    setPhase("waiting");
    const result = await createAlert({ tourCode, type, summary: typeMeta[type].summary, landmarkText: "背街中段 · 石砌拱门附近" });
    if (!result.ok) { setError(result.error); setPhase("confirm"); return; }
    setCreatedAlertId(result.alertId);
    // 状态由 /api/status 轮询获得；此处不伪造导游已确认。
  }

  const meta = typeMeta[type];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-qian-950/50 backdrop-blur-[2px]">
      <div className="w-full max-w-[430px] rounded-t-[28px] bg-card p-5 pb-8 pb-safe shadow-lift">
        {/* 头部：图标 + 文字明示「转交真人」 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="alert-pulse flex size-10 items-center justify-center rounded-2xl bg-cinnabar-600 text-white">
              <meta.icon className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-cinnabar-700">
                交给真人导游
              </p>
              <p className="text-xs text-ink-soft">
                阿黔不再闲聊，{guideName}会在几秒内收到
              </p>
            </div>
          </div>
          {phase !== "waiting" && !acknowledged && (
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="flex size-9 items-center justify-center rounded-full text-ink-faint hover:bg-qian-50"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {phase === "pick" && (
          <div className="mt-5 space-y-2.5">
            <p className="text-sm font-medium text-ink-soft">发生了什么？</p>
            <div className="grid grid-cols-2 gap-2.5">
              {(Object.keys(typeMeta) as AlertType[]).map((k) => {
                const m = typeMeta[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setType(k);
                      setPhase("confirm");
                    }}
                    className="flex min-h-[64px] items-center gap-2.5 rounded-2xl border border-cinnabar-500/25 bg-cinnabar-50/60 p-3 text-left transition active:scale-[0.97]"
                  >
                    <m.icon className="size-5 shrink-0 text-cinnabar-600" />
                    <span>
                      <span className="block text-sm font-semibold text-cinnabar-700">
                        {m.label}
                      </span>
                      <span className="block text-[11px] text-ink-faint">
                        {m.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "confirm" && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-qian-50 p-3.5">
              <p className="text-xs text-ink-faint">阿黔将这样告诉{guideName}：</p>
              <p className="mt-1 text-sm font-medium text-ink">{meta.summary}</p>
              <p className="mt-1 text-xs text-ink-faint">
                附近地标：背街中段 · 石砌拱门（可从核验地标中修改）
              </p>
            </div>

            <div className="space-y-2.5">
              <Button
                variant="cinnabar"
                size="xl"
                className="w-full"
                onClick={() => void submit()}
              >
                <Send className="size-4.5" />
                仅通知{guideName}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  setShareLocation(true);
                  void submit();
                }}
              >
                <MapPin className="size-4.5" />
                通知并分享一次位置
              </Button>
              <a href={`tel:${guidePhone.replace(/\s/g, "")}`} className="block">
                <Button variant="ghost" size="lg" className="w-full text-cinnabar-700">
                  <PhoneCall className="size-4.5" />
                  直接拨打{guideName}（{guidePhone}）
                </Button>
              </a>
              <p className="text-center text-[11px] leading-relaxed text-ink-faint">
                位置只在这次求助时分享一次，不会被持续记录
              </p>
            </div>
          </div>
        )}

        {phase === "waiting" && !acknowledged && (
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="size-8 animate-spin text-cinnabar-600" />
            <p className="font-display text-base font-semibold">
              已通知{guideName}，等待确认
            </p>
            <p className="text-xs text-ink-faint">
              {shareLocation ? "已附带您的一次性位置 · " : ""}
              通常几秒内就会有回应
            </p>
            <p className="text-[11px] text-ink-faint">导游确认后，此页会在状态同步中显示回复</p>
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-center text-xs text-cinnabar-700">{error}</p>}

        {acknowledged && (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-moss-100 p-4">
              <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-moss-600" />
              <div>
                <p className="font-display text-base font-semibold text-moss-700">
                  {guideName}已确认收到
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink">
                  「{ackAlert?.guideResponse || "已联系，请在原地等候，我过来接你"}」
                </p>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  结果已回传 · 你可在对话中继续追问
                </p>
              </div>
            </div>
            <Button size="xl" className="w-full" onClick={onClose}>
              好的，我在原地等
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
