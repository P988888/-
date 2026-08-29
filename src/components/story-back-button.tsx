"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * 从故事卡回到游客刚才所在的页面，保留“首页 / 行程 / 我的”标签与滚动位置。
 * 分享链接直接打开、没有可返回历史时回到产品首页，避免误进未登录的 /tour 后被送到 /join。
 */
export function StoryBackButton() {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
      window.history.back();
      return;
    }
    router.replace("/");
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-4 flex min-h-11 w-full items-center gap-2 rounded-2xl px-2 text-sm font-semibold text-[#526574] transition hover:bg-white/60 active:scale-[0.98]"
    >
      <ArrowLeft className="size-5" /> 返回我的旅程
    </button>
  );
}
