import {
  BookOpenCheck,
  Camera,
  MapPin,
  ScrollText,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppShell } from "@/components/app-shell";
import { AqianAvatar } from "@/components/aqian-avatar";
import { Badge } from "@/components/ui/badge";
import { formatCnDate } from "@/lib/utils";
import { getStoryCard } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import { seedDemoTour } from "@/lib/db/seed";

/**
 * 故事卡分享页 —— 只由真实 story_event 生成：
 * 听过的故事、答过的观察题、来源、路线日期。
 * 不含真实姓名（用昵称）、不含精确位置与轨迹。
 */
export default async function StoryCardPage({
  params,
}: {
  params: Promise<{ storyCardId: string }>;
}) {
  const { storyCardId } = await params;
  // 故事卡页可由游客端跳转或分享链接打开；演示卡首次打开时先初始化种子。
  if (storyCardId === "demo") seedDemoTour();
  const card = getStoryCard(storyCardId);
  if (!card) notFound();

  return (
    <AppShell>
      <main className="flex flex-1 flex-col items-center px-5 py-8">
        {/* 卡片本体：蜡染装裱 */}
        <article className="w-full overflow-hidden rounded-[28px] shadow-lift">
          {/* 卡头 */}
          <div className="batik-deep relative px-6 pb-6 pt-7 text-white">
            <div className="batik-band absolute inset-x-0 top-0 h-2 opacity-80" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AqianAvatar size={30} />
                <span className="font-display text-sm font-semibold tracking-wide">
                  阿黔 · 贵州故事卡
                </span>
              </div>
              <Badge className="border-white/25 bg-white/10 text-white">
                有源可溯
              </Badge>
            </div>
            <h1 className="font-display mt-5 text-3xl font-bold leading-snug">
              {card.title}
            </h1>
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-qian-100/90">
              <MapPin className="size-3.5" />
              {card.route} · {formatCnDate(card.date)} · {card.owner}的旅途
            </p>
          </div>

          {/* 卡身：宣纸底 */}
          <div className="paper-grain bg-card px-6 py-6">
            {/* 听过的故事（真实 story events） */}
            <section>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-qian-700">
                <ScrollText className="size-4" />
                这一路听过的故事
              </h2>
              <ul className="mt-3 space-y-3">
                {card.stories.map((s) => (
                  <li
                    key={s.title}
                    className="rounded-2xl border border-qian-100/80 bg-paper/60 p-3.5"
                  >
                    <p className="font-display text-[15px] font-semibold leading-snug">
                      {s.title}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">{s.note}</p>
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-pine-600">
                      <BookOpenCheck className="size-3.5" />
                      {s.source}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {/* 观察任务 */}
            {card.observation && <section className="mt-6">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-qian-700">
                <Camera className="size-4" />
                观察任务
              </h2>
              <div className="mt-3 rounded-2xl border border-pine-500/25 bg-pine-100/50 p-3.5">
                <p className="text-xs text-ink-faint">{card.observation.task}</p>
                <p className="font-display mt-2 text-[15px] leading-relaxed text-ink">
                  “{card.observation.answer}”
                </p>
              </div>
            </section>}

            {/* 来源清单 */}
            <section className="mt-6 border-t border-dashed border-qian-200 pt-4">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <ShieldCheck className="size-4 text-moss-600" />
                本卡内容来源（导游已审核）
              </h2>
              <ul className="mt-2 space-y-1">
                {card.sources.map((s) => (
                  <li key={s} className="text-[11px] text-ink-faint">
                    · {s}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[10px] leading-relaxed text-ink-faint">
                故事卡只记录真实听过、答过、选过的内容，不含精确位置与行程轨迹。
              </p>
            </section>

            {/* 卡尾 */}
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="font-display text-sm font-semibold text-qian-800">
                  扫码，让你的团也有阿黔
                </p>
                <p className="mt-0.5 text-[10px] text-ink-faint">
                  真人导游负责带团，阿黔负责接住漏掉的信号
                </p>
              </div>
              <div className="rounded-xl bg-card p-1.5 shadow-card">
                <QRCodeSVG
                  value="https://aqian.demo/"
                  size={64}
                  fgColor="#1f4a5e"
                  bgColor="#fffdf6"
                  level="M"
                />
              </div>
            </div>
          </div>
        </article>

        {/* 分享操作 */}
        <button
          type="button"
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-qian-700 text-base font-medium text-white shadow-card transition active:scale-[0.97]"
        >
          <Share2 className="size-4.5" />
          分享给同行的人
        </button>
        <p className="mt-3 text-center text-[11px] text-ink-faint">
          2026 多彩贵州「贵客松」AI 应用场景共创赛 · 阿黔团队
        </p>
      </main>
    </AppShell>
  );
}
