"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { GuideTabBar, type GuideTab } from "@/components/guide/tab-bar";
import { AlertsPanel } from "@/components/guide/panels/alerts-panel";
import { MembersPanel } from "@/components/guide/panels/members-panel";
import { SchedulePanel } from "@/components/guide/panels/schedule-panel";
import { InsightsPanel } from "@/components/guide/panels/insights-panel";
import { SettingsPanel } from "@/components/guide/panels/settings-panel";
import type { GuideAlert, Member, TourDay } from "@/lib/demo";
import { type StatusDTO } from "@/lib/contracts";
import type { KnowledgeCardDTO } from "@/lib/contracts";
import { acknowledgeAlert, resolveAlert } from "@/actions/alert-actions";
import { advanceTourDay, resetDemoTour } from "@/actions/tour-actions";

/** 2 秒轮询 /api/status，接住成员进团 / 提交求助等来自游客端的信号。 */
const statusFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("状态同步失败");
    return r.json() as Promise<StatusDTO>;
  });

/**
 * 本团服务驾驶舱（导游端）。
 * 底部导航分五个界面：异常 / 成员 / 行程 / 数据 / 设置。
 * 红色只给待处理异常；不做客流预测/画像大屏。
 */
interface GuideAppProps {
  tour: {
    code: string;
    name: string;
    route: string;
    guideName: string;
    guidePhone: string;
  };
  days: TourDay[];
  initialCurrentDay: number;
  members: Member[];
  initialAlerts: GuideAlert[];
  initialKnowledge: KnowledgeCardDTO[];
}

export function GuideApp({ tour, days, initialCurrentDay, members, initialAlerts, initialKnowledge }: GuideAppProps) {
  const [tab, setTab] = useState<GuideTab>("alerts");
  const [alerts, setAlerts] = useState(initialAlerts);
  const [memberList, setMemberList] = useState(members);
  const [currentDay, setCurrentDay] = useState(initialCurrentDay);

  // 2 秒轮询：成员进团 / 提交求助 / 结束当天，驾驶舱自动同步。
  useSWR<StatusDTO>(`/api/status?tourCode=${tour.code}&role=guide`, statusFetcher, {
    refreshInterval: 2_000,
    // 每次成功轮询（含首次）都同步到页面状态，接住游客端的新信号。
    onSuccess: (data) => {
      if (data.alerts) setAlerts(data.alerts);
      if (data.members) setMemberList(data.members);
      if (data.currentDay) setCurrentDay(data.currentDay);
    },
  });

  const openAlerts = alerts.filter((a) => a.status === "open");

  async function acknowledge(alertId: string) {
    const result = await acknowledgeAlert({ alertId, tourCode: tour.code, response: "已联系，请原地等候，集合时间顺延 10 分钟" });
    if (!result.ok) return;
    setAlerts((as) =>
      as.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: "acknowledged",
              guideResponse: "已联系，请原地等候，集合时间顺延 10 分钟",
            }
          : a
      )
    );
    const alert = alerts.find((a) => a.id === alertId);
    if (alert) {
      setMemberList((ms) =>
        ms.map((m) =>
          m.nickname === alert.memberNickname
            ? { ...m, status: "help_acknowledged" }
            : m
        )
      );
    }
    // 后端接入后：acknowledgeAlert Action → /api/status 回传游客端
  }

  async function resolve(alertId: string) {
    const result = await resolveAlert({ alertId, tourCode: tour.code });
    if (!result.ok) return;
    setAlerts((as) =>
      as.map((a) => (a.id === alertId ? { ...a, status: "resolved" } : a))
    );
    const alert = alerts.find((a) => a.id === alertId);
    if (alert) {
      setMemberList((ms) =>
        ms.map((m) =>
          m.nickname === alert.memberNickname
            ? { ...m, status: "checked_in" }
            : m
        )
      );
    }
    // 后端接入后：resolveAlert Action
  }

  async function resetDemo() {
    const result = await resetDemoTour(tour.code);
    if (result.ok) window.location.reload();
  }

  async function advanceDay() {
    const result = await advanceTourDay(tour.code);
    if (result.ok) setCurrentDay(result.currentDay);
  }

  return (
    <>
      {/* 头部 */}
      <header className="batik-deep sticky top-0 z-20 px-4 pb-4 pt-5 text-white pt-safe">
        <div className="batik-band absolute inset-x-0 top-0 h-1.5 opacity-70" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[1.4rem] font-semibold leading-tight">
              {tour.name}
            </p>
            <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-qian-100/90">
              团码{" "}
              <span className="font-mono font-semibold text-qian-50">
                {tour.code}
              </span>{" "}
              · {tour.route}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge
              variant="moss"
              className="border-transparent bg-white/15 px-3 py-1 text-sm text-white"
            >
              带团中
            </Badge>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-qian-100">
              Day {currentDay}/{days.length}
            </span>
          </div>
        </div>
      </header>

      {/* Tab 内容 */}
      <main className="flex-1 px-4 pb-28 pt-4">
        {tab === "alerts" && (
          <AlertsPanel
            alerts={alerts}
            guidePhone={tour.guidePhone}
            onAcknowledge={acknowledge}
            onResolve={resolve}
          />
        )}
        {tab === "members" && <MembersPanel members={memberList} />}
        {tab === "schedule" && (
          <SchedulePanel
            days={days}
            tourCode={tour.code}
            currentDay={currentDay}
            onAdvanceDay={advanceDay}
          />
        )}
        {tab === "insights" && <InsightsPanel tourCode={tour.code} />}
        {tab === "settings" && (
          <SettingsPanel
            tourCode={tour.code}
            initialKnowledge={initialKnowledge}
            onReset={resetDemo}
          />
        )}
      </main>

      <GuideTabBar
        active={tab}
        onChange={setTab}
        alertCount={openAlerts.length}
      />
    </>
  );
}
