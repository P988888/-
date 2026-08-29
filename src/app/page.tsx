import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

/**
 * 首页：封面海报 + 两个入口按钮图。
 * 「点击进团」按钮图覆盖在海报原「扫码进团」位置；「导游入口」按钮图在封面下方。
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

          {/* 进团入口：用新的「点击进团」按钮图覆盖原「扫码进团」位置 */}
          <Link
            href="/join"
            aria-label="点击进团"
            className="absolute left-[6%] right-[6%] top-[81%] outline-none transition active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-white/90 focus-visible:ring-offset-4 focus-visible:ring-offset-qian-950"
          >
            <Image
              src="/cover/btn-join.png"
              alt="点击进团"
              width={2172}
              height={724}
              priority
              className="h-auto w-full"
            />
          </Link>
        </div>

        {/* 导游入口：新的按钮图 */}
        <Link
          href="/guide"
          aria-label="导游入口"
          className="mt-5 block w-[88%] max-w-[378px] outline-none transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/80"
        >
          <Image
            src="/cover/btn-guide.png"
            alt="导游入口"
            width={2172}
            height={724}
            className="h-auto w-full"
          />
        </Link>
      </main>
    </AppShell>
  );
}
