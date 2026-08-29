import Link from "next/link";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { StoryBackButton } from "@/components/story-back-button";
import { formatCnDate } from "@/lib/utils";
import { getStoryCard } from "@/lib/db/queries";
import { db, schema } from "@/lib/db";
import { notFound } from "next/navigation";
import { seedDemoTour } from "@/lib/db/seed";

/** 一次“讲解 → 观察追问 → 游客作答”生成一段卡；同一游客的多段卡可前后切换。 */
export default async function StoryCardPage({ params }: { params: Promise<{ storyCardId: string }> }) {
  const { storyCardId } = await params;
  if (storyCardId === "demo") seedDemoTour();
  const card = getStoryCard(storyCardId);
  if (!card) notFound();

  const row = db.select({ tourCode: schema.storyCards.tourCode, memberId: schema.storyCards.memberId })
    .from(schema.storyCards).where(eq(schema.storyCards.id, storyCardId)).get();
  const sequence = row ? db.select({ id: schema.storyCards.id }).from(schema.storyCards)
    .where(and(eq(schema.storyCards.tourCode, row.tourCode), eq(schema.storyCards.memberId, row.memberId)))
    .orderBy(asc(schema.storyCards.createdAt)).all() : [];
  const index = sequence.findIndex((item) => item.id === storyCardId);
  const previousId = index > 0 ? sequence[index - 1]?.id : undefined;
  const nextId = index >= 0 && index < sequence.length - 1 ? sequence[index + 1]?.id : undefined;
  const quote = storyQuote(card.title, card.observation?.answer, card.stories[0]?.note);
  const source = card.sources[0] ?? card.stories[0]?.source ?? "本团导游审核内容";

  return (
    <AppShell>
      <main className="flex flex-1 flex-col items-center px-5 py-6">
        <StoryBackButton />
        <article className="w-full overflow-hidden rounded-[24px] border border-[#d7d7cf] bg-white shadow-lift">
          <header className="bg-[#183f36] px-6 py-7 text-white">
            <h1 className="font-display text-2xl font-bold">我的贵州故事卡</h1>
          </header>

          <div className="px-6 py-7">
            <p className="font-display text-lg font-bold text-[#b66b36]">{displayTitle(card.title)}</p>
            <blockquote className="font-display mt-7 whitespace-pre-line text-[22px] font-semibold leading-relaxed text-[#314a5a]">
              “{quote}”
            </blockquote>

            {card.observation && (
              <div className="mt-6 rounded-2xl bg-[#f8f4e9] px-4 py-3.5">
                <p className="text-[11px] font-semibold text-[#9a6b2f]">我在现场注意到</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#526574]">{card.observation.answer}</p>
              </div>
            )}

            <div className="mt-7 border-t border-[#d9dedf] pt-5 text-xs leading-relaxed text-[#78909d]">
              <p>内容来源：{source.replace(/\s*[·・]\s*传承人审核$/, "审核")}</p>
              <p className="mt-1.5">路线印记：{card.route}</p>
              <p className="mt-1.5">记录时间：{formatCnDate(card.date)}</p>
            </div>
            <p className="mt-8 font-semibold text-[#b66b36]">支持保存图片・一键分享朋友圈</p>
          </div>
        </article>

        {sequence.length > 1 && (
          <nav aria-label="故事段落切换" className="mt-4 grid w-full grid-cols-2 gap-3">
            {previousId ? (
              <Link href={`/story/${previousId}`} className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-[#b88a4b]/45 bg-white text-sm font-semibold text-[#8e642d]">
                <ChevronLeft className="size-4" /> 查看上一段故事
              </Link>
            ) : <span className="min-h-12" />}
            {nextId ? (
              <Link href={`/story/${nextId}`} className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-[#183f36] text-sm font-semibold text-white shadow-card">
                查看下一段故事 <ChevronRight className="size-4" />
              </Link>
            ) : <span className="min-h-12" />}
          </nav>
        )}

        <button type="button" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#aa7839] text-base font-medium text-white shadow-card transition active:scale-[0.97]">
          <Share2 className="size-4.5" /> 保存图片・一键分享朋友圈
        </button>
        <p className="mt-3 text-center text-[10px] leading-relaxed text-[#78909d]">
          本卡只记录游客真实问过、听过和观察到的内容；AI 不补写未发生的旅途。
        </p>
      </main>
    </AppShell>
  );
}

function displayTitle(title: string) {
  return title
    .replace(/石头寨\s*[·・]\s*布依族?蜡染.*/, "石头寨・布依蜡染")
    .replace(/[:：].*$/, "");
}

function storyQuote(title: string, answer?: string, note?: string) {
  if (/蜡染|留白/.test(`${title}${answer}${note}`)) return "颜色也可以用留白染出来——\n蜡封住的地方，就是布的呼吸。";
  if (answer?.trim()) return answer.trim().replace(/^[“\"]|[”\"]$/g, "");
  if (note?.trim()) return note.trim().slice(0, 72);
  return "我不只听见了一个故事，也在现场看见了属于自己的细节。";
}
