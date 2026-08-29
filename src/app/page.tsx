import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

/**
 * 首页封面：整张海报图（已含「点击进团」与「导游入口」两个按钮）。
 * 顶部对齐、可滚动，保证底部「导游入口」不被裁掉。
 */
export default function Home() {
  return (
    <AppShell className="bg-qian-950 shadow-none">
      <main className="w-full bg-qian-950">
        <div className="relative mx-auto aspect-[887/1774] w-full max-w-[430px]">
          <Image
            src="/cover/aqian-cover.png"
            alt="阿黔：每个团，都有一位记得你的 AI 副导"
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-contain"
          />

          {/* 点击进团 */}
          <Link
            href="/join"
            aria-label="点击进团，认识阿黔"
            className="absolute left-[10.7%] right-[10.6%] top-[74.9%] h-[10.4%] rounded-3xl outline-none transition focus-visible:ring-4 focus-visible:ring-white/90 focus-visible:ring-offset-4 focus-visible:ring-offset-qian-950"
          />

          {/* 导游入口 */}
          <Link
            href="/guide"
            aria-label="导游入口"
            className="absolute left-[10.8%] right-[10.6%] top-[87.2%] h-[9.4%] rounded-3xl outline-none transition focus-visible:ring-4 focus-visible:ring-white/90 focus-visible:ring-offset-4 focus-visible:ring-offset-qian-950"
          />
        </div>
      </main>
    </AppShell>
  );
}
