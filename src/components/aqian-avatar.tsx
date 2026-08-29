import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * 阿黔角色头像：从已确认的角色主视觉中裁切，保证封面、入团与对话区是同一个角色形象。
 */
export function AqianAvatar({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full bg-qian-950 ring-1 ring-white/40", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label="阿黔"
    >
      <Image
        src="/cover/aqian-cover.png"
        alt=""
        fill
        sizes={`${size}px`}
        className="object-cover"
        style={{ objectPosition: "50% 42%" }}
      />
    </div>
  );
}
