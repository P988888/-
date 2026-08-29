import { cn } from "@/lib/utils";

/**
 * H5 容器：手机上全宽；桌面端居中 430px 并衬一层宣纸底纹，
 * 保证「手机无横滚、375px 完整可用」的验收要求。
 */
export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="paper-grain min-h-dvh bg-paper">
      <div
        className={cn(
          "mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-paper shadow-[0_0_40px_rgb(20_46_59/0.08)]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
