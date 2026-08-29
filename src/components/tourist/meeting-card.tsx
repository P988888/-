"use client";

import { useEffect, useState } from "react";
import { ImageOff, MapPin, ShieldCheck, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCnTime } from "@/lib/utils";
import type { Stage } from "@/lib/demo";

/**
 * 下一集合卡 —— 永远排在聊天之前。
 * 集合信息 100% 读库不经模型；模型断开时此卡仍完整可用。
 */
export function MeetingCard({
  stage,
  dayLabel,
}: {
  stage: Stage;
  dayLabel?: string;
}) {
  return (
    <Card className="overflow-hidden border-qian-200">
      {/* 集合点照片：导游创建行程时配置，游客照着照片找位置；无照片时回退石板纹理 */}
      <div className="relative h-32">
        {stage.photo ? <MeetingPhoto stage={stage} /> : <div className="stone-wall absolute inset-0" />}
        <div className="absolute inset-0 bg-gradient-to-t from-qian-950/70 via-transparent to-transparent" />
        {dayLabel && (
          <span className="absolute left-4 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            {dayLabel}
          </span>
        )}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
          <div>
            <p className="flex items-center gap-1 text-[11px] text-qian-100/90">
              <MapPin className="size-3.5" /> 集合点
            </p>
            <p className="font-display mt-0.5 text-lg font-semibold leading-tight">
              {stage.point}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-faint">下一集合 · {stage.name}</p>
            <p className="font-display mt-1 text-3xl font-bold tracking-tight text-qian-800">
              {formatCnTime(stage.meetingTime)}
            </p>
          </div>
          <Countdown target={stage.meetingTime} />
        </div>

        <p className="mt-2.5 flex items-start gap-1.5 rounded-2xl bg-qian-50 px-3 py-2.5 text-[13px] leading-relaxed text-qian-800">
          <Flag className="mt-0.5 size-4 shrink-0" />
          {stage.pointHint}
        </p>

        {/* 高德定位地址 */}
        {stage.address && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-faint">
            <MapPin className="size-3.5 shrink-0 text-qian-500" />
            {stage.address}
          </p>
        )}

        {/* 来源标注：差异化「团上下文注入」的可视化 */}
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
          <ShieldCheck className="size-3.5 text-moss-600" />
          来自本团行程 · 导游 {formatCnTime(stage.updatedAt)} 更新 · AI 不会改动
        </p>
      </div>
    </Card>
  );
}

function MeetingPhoto({ stage }: { stage: Stage }) {
  const directUrl = stage.photo!;
  const proxyUrl = stage.id ? `/api/meeting-photo/${encodeURIComponent(stage.id)}` : "";
  const [loadState, setLoadState] = useState<{ photo: string; source: string; failed: boolean }>({
    photo: directUrl,
    source: directUrl,
    failed: false,
  });
  const current = loadState.photo === directUrl
    ? loadState
    : { photo: directUrl, source: directUrl, failed: false };

  if (current.failed) {
    return (
      <div className="stone-wall absolute inset-0 flex items-center justify-center text-white/80">
        <span className="flex items-center gap-1.5 rounded-full bg-qian-950/45 px-3 py-1.5 text-[11px] backdrop-blur">
          <ImageOff className="size-3.5" /> 照片暂时无法显示
        </span>
      </div>
    );
  }

  return (
    <img
      src={current.source}
      alt={`集合点照片：${stage.point}`}
      className="absolute inset-0 h-full w-full object-cover"
      onError={() => {
        setLoadState(proxyUrl && current.source !== proxyUrl
          ? { photo: directUrl, source: proxyUrl, failed: false }
          : { photo: directUrl, source: current.source, failed: true });
      }}
    />
  );
}

function Countdown({ target }: { target: string }) {
  const [remain, setRemain] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemain(new Date(target).getTime() - Date.now());
    tick();
    // 倒计时只呈现自然语言的分钟/小时，无需每秒刷新，避免数字跳动影响阅读。
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [target]);

  if (remain === null) {
    return <div className="h-14 w-24 rounded-2xl bg-qian-50" aria-hidden />;
  }
  if (remain <= 0) {
    return (
      <div className="rounded-2xl bg-cinnabar-50 px-3.5 py-2 text-center">
        <p className="text-[11px] text-cinnabar-700">已到集合时间</p>
        <p className="text-xs font-medium text-cinnabar-600">请尽快前往</p>
      </div>
    );
  }

  const label = formatRemain(remain);
  return (
    <div className="min-w-[108px] rounded-2xl bg-qian-700 px-3.5 py-2.5 text-center text-white shadow-card">
      <p className="text-[10px] tracking-wide text-qian-200">距集合</p>
      <p className="mt-0.5 whitespace-nowrap text-sm font-semibold leading-tight">{label}</p>
    </div>
  );
}

function formatRemain(milliseconds: number) {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return minutes ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`;
  return `${minutes} 分钟`;
}
