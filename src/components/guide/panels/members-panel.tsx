"use client";

import { Users, BookOpenCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Member } from "@/lib/demo";

const memberStatusMeta: Record<
  Member["status"],
  { label: string; variant: "moss" | "default" | "cinnabar" | "pine" }
> = {
  joined: { label: "已加入", variant: "default" },
  checked_in: { label: "已签到", variant: "moss" },
  help_pending: { label: "求助中", variant: "cinnabar" },
  help_acknowledged: { label: "已跟进", variant: "pine" },
  completed: { label: "已完成", variant: "moss" },
};

/** 成员状态列表 */
export function MembersPanel({ members }: { members: Member[] }) {
  const helpCount = members.filter((m) => m.status === "help_pending").length;

  return (
    <section aria-label="成员状态" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">
          成员（{members.length} 人）
        </h2>
        {helpCount > 0 && <Badge variant="cinnabar">{helpCount} 人求助中</Badge>}
      </div>

      <Card className="p-4">
        <ul className="divide-y divide-qian-100/70">
          {members.map((m) => {
            const meta = memberStatusMeta[m.status];
            return (
              <li
                key={m.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-qian-50 font-display text-sm font-semibold text-qian-700">
                    {m.nickname.slice(0, 1)}
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {m.nickname}
                      {m.storyDone && (
                        <BookOpenCheck
                          className="size-3.5 text-pine-500"
                          aria-label="已完成故事任务"
                        />
                      )}
                    </p>
                    <p className="text-[11px] text-ink-faint">
                      {m.language === "en" ? "English" : "中文"} ·{" "}
                      {m.interest === "culture" ? "人文历史" : "山水风物"}
                    </p>
                  </div>
                </div>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex items-center gap-1 border-t border-qian-100/70 pt-2.5 text-[11px] text-ink-faint">
          <Users className="size-3.5" />
          松金书本图标 = 已完成「石头城」观察任务（明细见「数据」页）
        </p>
      </Card>
    </section>
  );
}
