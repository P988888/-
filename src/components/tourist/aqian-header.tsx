import { AqianAvatar } from "@/components/aqian-avatar";

/** 阿黔状态栏：始终提示「阿黔正在与真人导游共同服务本团」 */
export function AqianHeader({
  tourName,
  guideName,
}: {
  tourName: string;
  guideName: string;
}) {
  return (
    <header className="batik-deep sticky top-0 z-20 px-4 pb-4 pt-5 text-white pt-safe">
      <div className="batik-band absolute inset-x-0 top-0 h-1.5 opacity-70" />
      <div className="flex items-center gap-3.5">
        <div className="relative">
          <AqianAvatar size={54} className="ring-2 ring-white/25" />
          {/* 在线状态：图标 + 文字，不只靠颜色 */}
          <span className="absolute -bottom-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-card">
            <span className="size-2.5 rounded-full bg-moss-600" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="font-display text-xl font-semibold">阿黔</p>
            <p className="text-xs text-moss-100">● 在线</p>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-qian-100/90">
            正与{guideName}共同服务 · {tourName}
          </p>
        </div>
      </div>
    </header>
  );
}
