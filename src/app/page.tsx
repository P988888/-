import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

/**
 * 首页封面：整张海报图（已含「点击进团」与「导游入口」两个按钮）。
 * 海报按原始 887×1774 清晰度完整展示，顶部对齐；小屏可向下滚动到导游入口。
 */
export default function Home() {
  return (
    <AppShell className="bg-qian-950 shadow-none">
      <main className="flex min-h-dvh w-full items-start justify-center overflow-y-auto bg-qian-950">
        <div className="relative aspect-[887/1774] w-full max-w-[430px] shrink-0">
          <Image
            src="/cover/aqian-cover-v2.png"
            alt="阿黔：每个团，都有一位记得你的 AI 副导"
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            quality={100}
            unoptimized
            className="object-contain"
          />

          {/* 点击进团 */}
          <Link
            href="/join"
            aria-label="点击进团，认识阿黔"
            className="absolute left-[10.7%] right-[10.6%] top-[74.9%] h-[10.4%] rounded-3xl outline-none transition active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-white/90"
          />

          {/* 导游入口 */}
          <Link
            href="/guide"
            aria-label="导游入口"
            className="absolute left-[10.8%] right-[10.6%] top-[87.2%] h-[9.4%] rounded-3xl outline-none transition active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-white/90"
          />
        </div>
      </main>
    </AppShell>
  );
}
