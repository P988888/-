"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, KeyRound, IdCard, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyGuidePin } from "@/actions/auth-actions";

/** 导游入口：团码 + 口令，单页进入驾驶舱 */
export default function GuideEntryPage() {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canEnter = code.trim().length >= 4 && pin.trim().length >= 4;

  async function enter() {
    if (!canEnter) {
      setError("请输入团码（至少 4 位）与 4 位以上导游口令");
      return;
    }
    setError(""); setSubmitting(true);
    const result = await verifyGuidePin({ tourCode: code, pin });
    setSubmitting(false);
    if (!result.ok) return setError(result.error);
    // 导游会话 Cookie 由 Server Action 写入；使用完整页面跳转，确保浏览器先落盘 Cookie，
    // 再请求驾驶舱，避免客户端路由缓存命中未登录响应后又回到 /guide。
    window.location.assign(`/guide/${encodeURIComponent(result.tourCode)}`);
  }

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-4 pb-2 pt-4">
        <Link href="/" aria-label="返回">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <p className="font-display text-lg font-semibold">导游工作台</p>
          <p className="text-xs text-ink-faint">口令只在服务端校验，不会出现在游客端</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-6 py-8">
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-medium text-ink-soft">
            <IdCard className="size-4" /> 团码
          </label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="例如 QY-9696"
            className="h-14 font-mono text-lg tracking-[0.2em]"
            maxLength={10}
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-medium text-ink-soft">
            <KeyRound className="size-4" /> 导游口令
          </label>
          <Input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="出团时设置的 4—6 位口令"
            className="h-14 text-lg"
            maxLength={6}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setCode("QY-9696");
            setPin("123456");
          }}
          className="self-start text-xs text-qian-500 underline underline-offset-2"
        >
          演示环境：点击填入演示团码与口令
        </button>
      </main>

      <footer className="space-y-2.5 px-6 pb-10">
        {error && <p role="alert" className="rounded-xl bg-cinnabar-50 px-3 py-2 text-center text-xs text-cinnabar-700">{error}</p>}
        <Button
          size="xl"
          className="w-full"
          disabled={submitting}
          onClick={enter}
        >
          {submitting ? "正在验证…" : "进入本团驾驶舱"}
        </Button>
        <Link href="/guide/new" className="block">
          <Button variant="outline" size="lg" className="w-full">
            <PlusCircle className="size-4.5" />
            创建新旅行团（约 3 分钟）
          </Button>
        </Link>
      </footer>
    </AppShell>
  );
}
