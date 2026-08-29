"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  QrCode,
  Mountain,
  ScrollText,
  Languages,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AqianAvatar } from "@/components/aqian-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { joinTour } from "@/actions/member-actions";

/** 加入旅行团：3 步进团（团码 → 昵称 → 语言与兴趣），不注册、不收手机号 */
export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [language, setLanguage] = useState<"zh" | "en">("zh");
  const [interest, setInterest] = useState<"nature" | "culture">("culture");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canNext =
    (step === 0 && code.trim().length >= 4) ||
    (step === 1 && nickname.trim().length >= 1) ||
    step === 2;

  function stepMissingHint(): string {
    if (step === 0) return "请输入团码（4—10 位，例如 QY-1024）";
    if (step === 1) return "请填写你的昵称";
    return "";
  }

  async function next() {
    if (!canNext) return setError(stepMissingHint());
    setError("");
    if (step < 2) return setStep(step + 1);
    setSubmitting(true);
    const result = await joinTour({
      tourCode: code.trim(), nickname: nickname.trim(), language, interest,
    });
    setSubmitting(false);
    if (!result.ok) return setError(result.error);
    router.push(`/tour/${encodeURIComponent(code.trim().toUpperCase())}`);
  }

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-4 pb-2 pt-4">
        <Link href="/" aria-label="返回">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <p className="font-display text-lg font-semibold">加入旅行团</p>
          <p className="text-xs text-ink-faint">第 {step + 1} 步，共 3 步 · 无需注册</p>
        </div>
        <AqianAvatar size={40} />
      </header>

      {/* 进度条 */}
      <div className="mx-5 mt-1 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= step ? "bg-qian-600" : "bg-qian-100"
            )}
          />
        ))}
      </div>

      <main className="mx-auto flex w-full max-w-[360px] flex-1 flex-col px-5 py-7">
        {step === 0 && (
          <section className="space-y-5">
            <div className="flex items-center gap-2 text-qian-700">
              <QrCode className="size-5" />
              <h1 className="font-display text-xl font-semibold">输入团码</h1>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">
              团码在导游发的二维码或微信群里。扫过码的朋友会自动跳到下一步。
            </p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="例如 QY-1024"
              className="h-12 text-center font-mono text-lg tracking-[0.22em]"
              maxLength={10}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setCode("QY-1024")}
              className="text-xs text-qian-500 underline underline-offset-2"
            >
              演示环境：点击填入演示团码 QY-1024
            </button>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-5">
            <div className="flex items-center gap-2 text-qian-700">
              <UserRound className="size-5" />
              <h1 className="font-display text-xl font-semibold">怎么称呼你？</h1>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">
              只用于导游和阿黔在团里称呼你，不需要手机号，也不会公开。
            </p>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="昵称，如：林先生"
              className="h-12 text-base"
              maxLength={12}
              autoFocus
            />
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-qian-700">
              <Languages className="size-5" />
              <h1 className="font-display text-xl font-semibold">
                想怎么听贵州的故事？
              </h1>
            </div>
            <div className="space-y-2.5">
              <p className="text-sm font-medium text-ink-soft">讲解语言</p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { v: "zh", label: "中文" },
                    { v: "en", label: "English" },
                  ] as const
                ).map((o) => (
                  <ChoiceButton
                    key={o.v}
                    active={language === o.v}
                    onClick={() => setLanguage(o.v)}
                  >
                    {o.label}
                  </ChoiceButton>
                ))}
              </div>
            </div>
            <div className="space-y-2.5">
              <p className="text-sm font-medium text-ink-soft">更感兴趣</p>
              <div className="grid grid-cols-2 gap-3">
                <ChoiceButton
                  active={interest === "culture"}
                  onClick={() => setInterest("culture")}
                  icon={<ScrollText className="size-5" />}
                >
                  人文历史
                </ChoiceButton>
                <ChoiceButton
                  active={interest === "nature"}
                  onClick={() => setInterest("nature")}
                  icon={<Mountain className="size-5" />}
                >
                  山水风物
                </ChoiceButton>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-ink-faint">
              同一份导游审核过的内容，阿黔会按你的语言和兴趣调整讲法——事实不变。
            </p>
          </section>
        )}
      </main>

      <footer className="mx-auto w-full max-w-[360px] px-5 pb-8">
        {error && <p role="alert" className="mb-3 rounded-xl bg-cinnabar-50 px-3 py-2 text-center text-xs text-cinnabar-700">{error}</p>}
        <Button
          size="xl"
          className="w-full"
          disabled={submitting}
          onClick={next}
        >
          {submitting ? "正在加入…" : step === 2 ? `进团，和「${nickname || "我"}」一起出发` : "下一步"}
        </Button>
      </footer>
    </AppShell>
  );
}

function ChoiceButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-all active:scale-[0.97]",
        active
          ? "border-qian-600 bg-qian-700 text-white shadow-card"
          : "border-qian-200 bg-card text-ink-soft shadow-card"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
