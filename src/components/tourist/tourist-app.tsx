"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  House,
  Map,
  Phone,
  SendHorizonal,
  UserRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { AqianHeader } from "@/components/tourist/aqian-header";
import { MeetingCard } from "@/components/tourist/meeting-card";
import { StageCard } from "@/components/tourist/stage-card";
import { QuickActions, type QuickActionKey } from "@/components/tourist/quick-actions";
import { ChatPanel } from "@/components/tourist/chat-panel";
import { AlertCard } from "@/components/tourist/alert-card";
import { type ChatMessage, type TourDay, type GuideAlert } from "@/lib/demo";
import { type StatusDTO } from "@/lib/contracts";
import { recordStoryEvent, generateStoryCard } from "@/actions/story-actions";

let seq = 100;
const nextId = () => `local-${seq++}`;

/** 2 秒轮询 /api/status，拿到导游端的最新行程与自己的异常状态。 */
const statusFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("状态同步失败");
    return r.json() as Promise<StatusDTO>;
  });
const STATUS_REFRESH = 2_000;

/** 拒答硬门：知识库外不编造，转固定文案 + 指向真人导游 */
const refusalMessage: ChatMessage = {
  id: "c-refusal",
  role: "aqian",
  text: "这件事我暂时无法确认，不敢随便回答。我已为你保留当前团的集合信息；如需帮助，请直接联系周导，或点上方「我需要帮助」。",
  source: "知识库未收录 · 已按规则转人工",
};

interface TouristAppProps {
  tour: { code: string; name: string; guideName: string; guidePhone: string };
  days: TourDay[];
  currentDay: number;
  initialMessages: ChatMessage[];
}

type TouristTab = "home" | "itinerary" | "profile";

export function TouristApp({ tour, days, currentDay, initialMessages }: TouristAppProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [typing, setTyping] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState<TouristTab>("home");
  const [pendingObservation, setPendingObservation] = useState<{ prompt: string; knowledgeCardId: string } | null>(null);

  // 2 秒轮询：导游改行程 / 确认异常 / 结束当天，游客端自动同步
  const { data: status } = useSWR<StatusDTO>(`/api/status?tourCode=${tour.code}&role=member`, statusFetcher, { refreshInterval: STATUS_REFRESH });
  const liveDays = status?.days ?? days;
  const liveCurrentDay = status?.currentDay ?? currentDay;
  const liveAlerts: GuideAlert[] = status?.alerts ?? [];
  const storyCardId = status?.storyCardId;

  // 集合信息始终取自「今天」这一天
  const today = liveDays.find((d) => d.day === liveCurrentDay) ?? liveDays[0];
  const nextStage = today.stages.find((s) => s.isCurrent) ?? today.stages[0];
  // 「听当前故事」＝当前游览节点：随导游更新行程 / 结束当天 / 游客切换日而实时变化。
  const currentStorySpot = nextStage
    ? nextStage.name.split("·")[0]?.trim() || nextStage.point
    : "";

  async function ask(text: string) {
    setTyping(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tourCode: tour.code, message: text }) });
      const result = await response.json() as { kind?: "answer" | "alert_card"; message?: ChatMessage & { knowledgeCardIds?: string[] }; alertType?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "暂时无法回答，请稍后再试");
      if (result.kind === "alert_card") setAlertOpen(true);
      else if (result.message) {
        const msg = result.message;
        setMessages((ms) => [...ms, { ...msg, id: msg.id || nextId() }]);
        // 文化类回答来自已审核知识卡 → 记一次「听过的故事」，供故事卡只引真实内容。
        if (msg.intent === "culture" && msg.knowledgeCardIds?.length) {
          const knowledgeCardId = msg.knowledgeCardIds[0];
          void recordStoryEvent({ tourCode: tour.code, kind: "listened", refId: knowledgeCardId });
          if (msg.observationPrompt) setPendingObservation({ prompt: msg.observationPrompt, knowledgeCardId });
        }
      }
    } catch (error) {
      setMessages((ms) => [...ms, { ...refusalMessage, id: nextId(), text: error instanceof Error ? error.message : refusalMessage.text }]);
    } finally { setTyping(false); }
  }

  function onQuickAction(key: QuickActionKey) {
    if (key === "help") return setAlertOpen(true);
    const asks: Record<string, string> = {
      meeting: "我们几点集合？",
      facility: "附近有洗手间吗？",
      story: currentStorySpot ? `讲讲「${currentStorySpot}」的故事吧` : "讲讲这里的故事吧",
    };
    setMessages((ms) => [...ms, { id: nextId(), role: "me", text: asks[key] }]);
    void ask(asks[key]);
  }

  /** 原型演示用规则层：集合→读库；风险词→转人工操作卡；文化→检索；其他→拒答硬门 */
  function onSend() {
    const text = draft.trim();
    if (!text || typing) return;
    setDraft("");
    setMessages((ms) => [...ms, { id: nextId(), role: "me", text }]);

    if (pendingObservation) {
      const observation = pendingObservation;
      setPendingObservation(null);
      setTyping(true);
      void (async () => {
        try {
          await recordStoryEvent({
            tourCode: tour.code,
            kind: "answered",
            refId: observation.knowledgeCardId,
            payload: { task: observation.prompt, answer: text },
          });
          const result = await generateStoryCard(tour.code, observation.knowledgeCardId);
          if (!result.ok) throw new Error("故事卡生成失败");
          setMessages((ms) => [...ms, {
            id: nextId(), role: "aqian", intent: "culture",
            text: `你注意到的这个细节很重要。它把刚才的讲解变成了你自己的现场记忆：${text}。我已经把“听到的知识、你的观察和审核来源”整理成这一段贵州故事。`,
            source: "基于你的真实观察 · 已审核讲解内容",
            storyCardId: result.storyCardId,
          }]);
        } catch {
          setMessages((ms) => [...ms, { ...refusalMessage, id: nextId(), text: "我记住了你的观察，但故事卡暂时生成失败，请稍后再试。" }]);
        } finally {
          setTyping(false);
        }
      })();
      return;
    }

    void ask(text);
  }

  return (
    <>
      <AqianHeader tourName={tour.name} guideName={tour.guideName} />

      <main className={`flex-1 px-4 pt-4 ${activeTab === "home" ? "pb-48" : "pb-28"}`}>
        {activeTab === "home" && (
          <div className="space-y-4">
            {/* 集合卡永远排在聊天之前 */}
            <MeetingCard
              stage={nextStage}
              dayLabel={`Day ${liveCurrentDay}/${liveDays.length} · 今天`}
            />
            <QuickActions currentPoint={currentStorySpot} onAction={onQuickAction} />
            <section aria-label="与阿黔的对话">
              <ChatPanel messages={messages} typing={typing} />
            </section>
          </div>
        )}

        {activeTab === "itinerary" && (
          <section aria-label="本团行程">
            <div className="mb-3 px-1">
              <p className="text-xs font-medium text-qian-600">本团日程</p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink">全程行程</h1>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">行程以导游更新为准，阿黔不会自行修改。</p>
            </div>
            <StageCard days={liveDays} currentDay={liveCurrentDay} tourCode={tour.code} />
          </section>
        )}

        {activeTab === "profile" && (
          <section aria-label="我的">
            <div className="mb-3 px-1">
              <p className="text-xs font-medium text-qian-600">我的旅程</p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink">我的</h1>
            </div>
            <div className="space-y-3">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-qian-50 text-qian-700">
                    <UserRound className="size-5" />
                  </span>
                  <span>
                    <span className="block text-xs text-ink-faint">本团导游</span>
                    <span className="mt-0.5 block text-base font-semibold text-ink">{tour.guideName}</span>
                  </span>
                </div>
                <a
                  href={`tel:${tour.guidePhone.replace(/\s/g, "")}`}
                  className="mt-4 flex min-h-11 items-center justify-between rounded-2xl bg-qian-700 px-3.5 text-sm font-medium text-white transition active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2"><Phone className="size-4" /> {tour.guidePhone}</span>
                  <span className="text-white/75">拨打导游</span>
                </a>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-qian-700" />
                  <h2 className="text-[15px] font-semibold text-ink">日程信息</h2>
                </div>
                <div className="mt-3 space-y-2.5">
                  {liveDays.map((day) => {
                    const current = day.day === liveCurrentDay;
                    const first = day.stages[0];
                    return (
                      <div key={day.day} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${current ? "bg-qian-50" : "bg-paper"}`}>
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${current ? "bg-qian-700 text-white" : "bg-qian-100 text-qian-600"}`}>D{day.day}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{day.title}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-faint"><Clock3 className="size-3" /> {first?.point ?? "待导游补充"}</span>
                        </span>
                        {current && <span className="text-[11px] font-medium text-qian-600">今天</span>}
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setActiveTab("itinerary")} className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-qian-200 text-sm font-medium text-qian-700">
                  <Map className="size-4" /> 查看完整行程
                </button>
              </Card>

              <Link href={storyCardId ? `/story/${storyCardId}` : "/story/demo"} className="block" aria-label="查看我的贵州故事卡">
                <Card className="flex min-h-16 items-center justify-between border-[#c49a55]/35 bg-[#fbf4df] px-4 py-3.5 transition active:scale-[0.98]">
                  <span className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#aa7839] text-white shadow-card">
                      <BookOpenCheck className="size-5" />
                    </span>
                    <span className="text-[15px] font-semibold text-ink">查看我的贵州故事卡</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-[#aa7839]" />
                </Card>
              </Link>
            </div>
          </section>
        )}
      </main>

      {/* 首页保留对话输入；切换到行程或我的时不占用屏幕。 */}
      {activeTab === "home" && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 mx-auto w-full max-w-[430px]">
          <div className="border-t border-qian-100 bg-card/95 px-3 pb-3 pt-2.5 backdrop-blur">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={1}
                placeholder={pendingObservation ? "说说你注意到的细节、感受或好奇的问题…" : "问集合、问故事，或说「我需要帮助」…"}
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-qian-200 bg-paper px-3.5 py-2.5 text-[15px] outline-none placeholder:text-ink-faint focus:border-qian-400"
              />
              <button
                type="button"
                onClick={onSend}
                disabled={!draft.trim()}
                aria-label="发送"
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-qian-700 text-white shadow-card transition active:scale-95 disabled:opacity-40"
              >
                <SendHorizonal className="size-5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-ink-faint">
              集合时间地点由本团行程提供，AI 不会编造 · 紧急情况请直接拨打 110 / 120
            </p>
          </div>
        </div>
      )}

      <nav aria-label="游客端导航" className="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-[68px] w-full max-w-[430px] border-t border-qian-100 bg-card/95 px-5 pb-safe backdrop-blur">
        <TouristTabButton active={activeTab === "home"} label="首页" icon={House} onClick={() => setActiveTab("home")} />
        <TouristTabButton active={activeTab === "itinerary"} label="行程" icon={Map} onClick={() => setActiveTab("itinerary")} />
        <TouristTabButton active={activeTab === "profile"} label="我的" icon={UserRound} onClick={() => setActiveTab("profile")} />
      </nav>

      {alertOpen && (
        <AlertCard
          tourCode={tour.code}
          guideName={tour.guideName}
          guidePhone={tour.guidePhone}
          myAlerts={liveAlerts}
          onClose={() => setAlertOpen(false)}
        />
      )}
    </>
  );
}

function TouristTabButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: typeof House;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition ${active ? "font-semibold text-qian-700" : "text-ink-faint"}`}
    >
      <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
      {label}
    </button>
  );
}
