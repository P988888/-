import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 时间显示钉死 Asia/Shanghai，避免与 UTC 差 8 小时 */
export function formatCnTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatCnDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}
