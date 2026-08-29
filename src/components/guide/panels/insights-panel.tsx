"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  MessageCircleQuestion,
  BookOpenCheck,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Clock3,
  MapPin,
  HelpCircle,
  Camera,
  CircleCheck,
  Circle,
  BookMarked,
  UsersRound,
  Inbox,
  BookPlus,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCnTime, cn } from "@/lib/utils";
import { collectQuestionAsKnowledgeCard } from "@/actions/knowledge-actions";
import type { Member, QuestionItem } from "@/lib/demo";
import type { StatusDTO } from "@/lib/contracts";

type Screen = "overview" | "questions" | "story" | "guide-story";

const intentMeta: Record<
  QuestionItem["intent"],
  { label: string; icon: typeof Clock3; variant: "default" | "pine" | "moss" | "outline" }
> = {
  schedule: { label: "集合行程", icon: Clock3, variant: "default" },
  facility: { label: "附近设施", icon: MapPin, variant: "moss" },
  culture: { label: "文化故事", icon: BookOpen, variant: "pine" },
  other: { label: "其他", icon: HelpCircle, variant: "outline" },
};

const statusFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("状态同步失败");
    return r.json() as Promise<StatusDTO>;
  });

/** 数据 Tab：概览卡可点进「问题摘要」「故事完成」两个详情页。 */
export function InsightsPanel({ tourCode }: { tourCode: string }) {
  const [screen, setScreen] = useState<Screen>("overview");
  // 2 秒轮询（与驾驶舱共享同一 key，SWR 去重、不重复发请求），接住最新的提问消息。
  const { data } = useSWR<StatusDTO>(`/api/status?tourCode=${tourCode}&role=guide`, statusFetcher, {
    refreshInterval: 2_000,
  });
  const questions: QuestionItem[] = data?.questions ?? [];
  const members: Member[] = data?.members ?? [];
  const storyTask = data?.storyTask ?? null;
  const storyDone = members.filter((m) => m.storyDone).length;

  if (screen === "questions") {
    return <QuestionsScreen questions={questions} tourCode={tourCode} onBack={() => setScreen("overview")} />;
  }
  if (screen === "story") {
    return <StoryScreen members={members} storyTask={storyTask} onBack={() => setScreen("overview")} />;
  }
  if (screen === "guide-story") {
    return <GuideStoryScreen members={members} onBack={() => setScreen("overview")} />;
  }

  // —— 概览（可点击卡片）——
  const topIntent = topIntentLabel(questions);

  return (
    <section aria-label="本团数据" className="space-y-3">
      <h2 className="font-display text-base font-semibold">本团数据</h2>
      <p className="-mt-1 text-xs text-ink-faint">
        只看「阿黔替你接住了什么」，不做客流预测与画像大屏
      </p>

      <button type="button" onClick={() => setScreen("questions")} className="block w-full text-left">
        <Card className="flex items-center gap-3.5 p-4 transition-all active:scale-[0.98]">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-qian-50 text-qian-600">
            <MessageCircleQuestion className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-qian-800">{questions.length}</span>
              <span className="text-sm font-medium">今日提问</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink-soft">
              {questions.length === 0
                ? "游客还没提问，问过之后这里会实时统计"
                : `最高频「${topIntent}」· 点击查看全部问题与来源`}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-faint" />
        </Card>
      </button>

      <button type="button" onClick={() => setScreen("guide-story")} className="block w-full text-left">
        <Card className="flex items-center gap-3.5 border-pine-500/25 bg-pine-100/40 p-4 transition-all active:scale-[0.98]">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-card text-pine-600 shadow-card">
            <BookMarked className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="text-sm font-medium">本团故事册</span>
              <span className="text-xs text-pine-600">导游复盘版</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink-soft">
              看本团收录的讲解主题与完成进度，不展示游客个人故事正文
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-pine-600" />
        </Card>
      </button>

      <button type="button" onClick={() => setScreen("story")} className="block w-full text-left">
        <Card className="flex items-center gap-3.5 p-4 transition-all active:scale-[0.98]">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-pine-100 text-pine-600">
            <BookOpenCheck className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-qian-800">
                {storyDone}
                <span className="text-sm text-ink-faint">/{members.length}</span>
              </span>
              <span className="text-sm font-medium">故事任务完成</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink-soft">
              {storyTask ? `「${storyTask.title}」· 点击查看每人进度与任务设置` : "本线路暂未配置观察任务"}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ink-faint" />
        </Card>
      </button>

      {/* 意图分布 */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold">提问类型分布</h3>
        {questions.length === 0 ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
            <Inbox className="size-4" /> 暂无提问，游客问过后这里会按类型汇总
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {(Object.keys(intentMeta) as QuestionItem["intent"][]).map((k) => {
              const count = questions.filter((q) => q.intent === k).length;
              if (count === 0) return null;
              const pct = Math.round((count / questions.length) * 100);
              const meta = intentMeta[k];
              return (
                <div key={k} className="flex items-center gap-2.5">
                  <meta.icon className="size-4 shrink-0 text-qian-500" />
                  <span className="w-16 text-xs text-ink-soft">{meta.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-qian-50">
                    <div className="h-full rounded-full bg-qian-600" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-medium text-ink">{count} 条</span>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
          「集合行程」类问题阿黔已 100% 按本团行程自动回答，没有占用你一次对讲机。
        </p>
      </Card>
    </section>
  );
}

/** 详情页：今日提问全部记录 */
function QuestionsScreen({
  questions,
  tourCode,
  onBack,
}: {
  questions: QuestionItem[];
  tourCode: string;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<QuestionItem["intent"] | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [collectedId, setCollectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const list = filter === "all" ? questions : questions.filter((q) => q.intent === filter);

  async function collect(q: QuestionItem) {
    setBusyId(q.id);
    setError("");
    const result = await collectQuestionAsKnowledgeCard(tourCode, { question: q.text, intent: q.intent });
    setBusyId(null);
    if (result.ok) setCollectedId(q.id);
    else setError(result.error);
  }

  return (
    <section aria-label="今日提问明细" className="space-y-3">
      <DetailHeader title="今日提问明细" onBack={onBack} />

      {/* 类型筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          全部 {questions.length}
        </FilterChip>
        {(Object.keys(intentMeta) as QuestionItem["intent"][]).map((k) => {
          const n = questions.filter((q) => q.intent === k).length;
          if (n === 0) return null;
          return (
            <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)}>
              {intentMeta[k].label} {n}
            </FilterChip>
          );
        })}
      </div>

      {list.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-6 text-center">
          <Inbox className="size-7 text-qian-300" />
          <p className="text-sm font-medium text-ink">还没有提问记录</p>
          <p className="text-xs leading-relaxed text-ink-faint">
            游客在首页问阿黔的话会实时出现在这里；阿黔不会编造、答不上会转人工。
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((q) => {
            const meta = intentMeta[q.intent];
            return (
              <Card key={q.id} className="p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{q.memberNickname}</p>
                  <span className="text-[11px] text-ink-faint">{formatCnTime(q.createdAt)}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink">“{q.text}”</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={meta.variant}>
                    <meta.icon className="size-3" />
                    {meta.label}
                  </Badge>
                  {q.sourceLabel ? (
                    <span className="flex items-center gap-1 text-[11px] text-pine-600">
                      <BookOpenCheck className="size-3.5" />
                      已按 {q.sourceLabel} 回答
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink-faint">已拒答并提示转人工</span>
                  )}
                </div>

                {/* 答不上/高频的问题 → 收录为知识卡，导游补答案后游客即可命中 */}
                {!q.sourceLabel && (
                  <div className="mt-2.5 border-t border-qian-100/70 pt-2.5">
                    {collectedId === q.id ? (
                      <p className="flex items-center gap-1 text-[11px] text-pine-600">
                        <BookPlus className="size-3.5" /> 已收录为草稿知识卡
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void collect(q)}
                        disabled={busyId === q.id}
                        className="flex min-h-9 items-center gap-1.5 rounded-full border border-qian-200 px-3 text-xs font-medium text-qian-700 transition active:scale-95 disabled:opacity-60"
                      >
                        {busyId === q.id ? (
                          <><Loader2 className="size-3.5 animate-spin" /> 收录中…</>
                        ) : (
                          <><BookPlus className="size-3.5" /> 收录为知识卡</>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-cinnabar-50 px-3 py-2 text-xs text-cinnabar-700">{error}</p>}

      {questions.some((q) => !q.sourceLabel) && (
        <p className="px-0.5 text-[11px] leading-relaxed text-ink-faint">
          高频/被拒答的问题可以点「收录为知识卡」转成草稿，再到 设置 → 知识库 补答案并设为「已审核」；之后同类提问游客就能直接得到答案。
        </p>
      )}
    </section>
  );
}

/** 详情页：故事任务进度与设置 */
function StoryScreen({
  members,
  storyTask,
  onBack,
}: {
  members: Member[];
  storyTask: { id: string; title: string; brief: string; clues: string[] } | null;
  onBack: () => void;
}) {
  const done = members.filter((m) => m.storyDone).length;
  const pct = members.length > 0 ? Math.round((done / members.length) * 100) : 0;

  return (
    <section aria-label="故事任务详情" className="space-y-3">
      <DetailHeader title="故事任务" onBack={onBack} />

      {storyTask ? (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-[15px] font-semibold">「{storyTask.title}」</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{storyTask.brief}</p>
            </div>
            <Badge variant="pine">进行中</Badge>
          </div>
          <div className="mt-3 flex gap-2">
            {storyTask.clues.map((c) => (
              <span key={c} className="rounded-full border border-pine-500/30 bg-pine-100/60 px-2.5 py-1 text-xs text-pine-600">
                {c}
              </span>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span>完成进度</span>
              <span className="font-semibold text-qian-800">
                {done}/{members.length} · {pct}%
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-qian-50">
              <div className="h-full rounded-full bg-pine-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <p className="text-sm font-medium text-ink">本线路暂未配置观察任务</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
            在导游端可单独设置故事任务；设置后游客「我的」页会出现对应的观察指引。
          </p>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold">每人完成情况</h3>
        {members.length === 0 ? (
          <p className="text-xs text-ink-faint">还没有游客进团。</p>
        ) : (
          <ul className="divide-y divide-qian-100/70">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  {m.storyDone ? <CircleCheck className="size-5 text-moss-600" /> : <Circle className="size-5 text-qian-200" />}
                  <span className="text-sm">{m.nickname}</span>
                </div>
                <span className={cn("text-xs", m.storyDone ? "text-moss-600" : "text-ink-faint")}>
                  {m.storyDone ? "已生成故事卡" : "未完成"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Link href="/story/demo" className="block">
        <Button variant="outline" size="lg" className="w-full">
          <Camera className="size-4" />
          查看一张已生成的故事卡
        </Button>
      </Link>
    </section>
  );
}

/** 导游版故事卡：复盘团内服务，不复用或泄露游客的个人纪念卡。 */
function GuideStoryScreen({ members, onBack }: { members: Member[]; onBack: () => void }) {
  const done = members.filter((member) => member.storyDone).length;
  const themes = [
    { title: "石头城的来处", source: "《青岩镇志》· 导游已审核" },
    { title: "背街的电影记忆", source: "《青岩镇志》· 导游已审核" },
    { title: "马头墙与屯堡营造", source: "贵州省博物馆 · 展陈资料" },
  ];

  return (
    <section aria-label="本团故事册" className="space-y-3">
      <DetailHeader title="本团故事册" onBack={onBack} />
      <p className="-mt-1 px-1 text-xs leading-relaxed text-ink-faint">
        这是导游的服务复盘，不是游客的个人故事卡；不展示个人观察答案、位置或旅途正文。
      </p>

      <Card className="overflow-hidden border-pine-500/25">
        <div className="bg-pine-100/65 p-4">
          <div className="flex items-center gap-2 text-pine-600">
            <BookMarked className="size-5" />
            <p className="font-display text-[15px] font-semibold">这一团，阿黔接住了什么</p>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            团员在自由探索时问到的文化问题，被整理为有来源的讲解线索；导游可以据此判断下一段讲解该补充什么。
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-qian-100/70 bg-card">
          <div className="p-4 text-center">
            <p className="font-display text-2xl font-bold text-qian-800">{themes.length}</p>
            <p className="mt-0.5 text-xs text-ink-faint">收录讲解主题</p>
          </div>
          <div className="p-4 text-center">
            <p className="font-display text-2xl font-bold text-qian-800">
              {done}/{members.length}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">完成故事任务</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <UsersRound className="size-4 text-qian-600" /> 本团可复用的讲解线索
        </h3>
        <ul className="mt-2 divide-y divide-qian-100/70">
          {themes.map((theme) => (
            <li key={theme.title} className="py-3">
              <p className="text-sm font-medium text-ink">{theme.title}</p>
              <p className="mt-0.5 text-[11px] text-pine-600">来源：{theme.source}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-2xl bg-qian-50 px-3 py-2.5 text-[11px] leading-relaxed text-ink-faint">
          导游版只帮助复盘讲解效果；游客个人故事卡仍仅由其真实听过、答过、选过的内容生成。
        </p>
      </Card>
    </section>
  );
}

function topIntentLabel(questions: QuestionItem[]): string {
  if (questions.length === 0) return "暂无";
  const counts = questions.reduce<Record<string, number>>((m, q) => {
    m[q.intent] = (m[q.intent] ?? 0) + 1;
    return m;
  }, {});
  const top = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other") as QuestionItem["intent"];
  return intentMeta[top]?.label ?? "其他";
}

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="返回数据概览"
        className="flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-qian-50"
      >
        <ChevronLeft className="size-5" />
      </button>
      <h2 className="font-display text-base font-semibold">{title}</h2>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-all active:scale-95",
        active ? "border-qian-700 bg-qian-700 text-white" : "border-qian-200 bg-card text-ink-soft"
      )}
    >
      {children}
    </button>
  );
}
