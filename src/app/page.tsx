import Image from "next/image";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";

/**
 * 封面采用已确认的角色视觉稿；底部 CTA 仍是一个真实的 Link，
 * 只是不重复绘制卡片，避免与图片中的设计稿叠成两层。
 * 封面下方附一个低调的「导游入口」，供导游直达驾驶舱（不抢游客主 CTA）。
 */
export default function Home() {
  return (
    <AppShell className="bg-qian-950 shadow-none">
      <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-qian-950">
        <div className="relative aspect-[941/1672] w-full max-w-[430px] shrink-0">
          <Image
            src="/cover/aqian-cover.png"
            alt="阿黔：每个团，都有一位记得你的 AI 副导"
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-contain"
          />

          <Link
            href="/join"
            aria-label="扫码进团，认识阿黔"
            className="absolute left-[8%] right-[8%] top-[82%] h-[14%] rounded-[32px] outline-none transition focus-visible:ring-4 focus-visible:ring-white/90 focus-visible:ring-offset-4 focus-visible:ring-offset-qian-950"
          >
            <span className="sr-only">扫码进团，认识阿黔</span>
          </Link>
        </div>

        <Link
          href="/guide"
          aria-label="导游入口"
          className="group relative mt-5 inline-flex h-[104px] w-[84%] max-w-[361px] shrink-0 items-center gap-3 rounded-[34px] px-4 text-[22px] font-bold tracking-wide text-[#f7eeda] outline-none transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/80"
          style={{
            background:
              "linear-gradient(100deg, #6fc7dd 0%, #3ba0bc 40%, #226c86 76%, #123f56 100%)",
            boxShadow:
              "0 0 0 1.5px rgba(223,194,126,0.85), 0 0 0 4px rgba(127,178,194,0.22), 0 10px 32px rgba(63,167,196,0.45), inset 0 0 0 1px rgba(255,255,255,0.28), inset 0 -14px 28px rgba(0,0,0,0.22)",
          }}
        >
          {/* 底部金色反光 */}
          <span
            className="pointer-events-none absolute inset-x-9 -bottom-px h-[3px] rounded-full bg-gradient-to-r from-transparent via-pine-300/90 to-transparent"
            aria-hidden
          />
          {/* 左侧图标托盘（对照扫码按钮的二维码托盘） */}
          <span className="flex size-[66px] shrink-0 items-center justify-center rounded-2xl border border-white/40 bg-qian-900/50 shadow-inner">
            <KeyRound className="size-8 text-[#f7eeda]" strokeWidth={1.8} aria-hidden />
          </span>
          {/* 竖直分隔线 */}
          <span className="mx-0.5 h-[52px] w-px shrink-0 bg-white/35" aria-hidden />
          {/* 文案 */}
          <span className="flex-1 text-[22px] font-bold tracking-wide text-[#f7eeda]">
            导游入口
          </span>
          {/* 右侧箭头圆 */}
          <span
            className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-qian-900/55 text-2xl text-white"
            aria-hidden
          >
            →
          </span>
        </Link>
      </main>
    </AppShell>
  );
}
