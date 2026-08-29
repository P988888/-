"use client";

import { useState } from "react";
import Link from "next/link";
import {
  QrCode,
  RotateCcw,
  PlusCircle,
  KeyRound,
  ChevronRight,
  LogOut,
  BookOpenCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { KnowledgePanel } from "@/components/guide/panels/knowledge-panel";
import { cn } from "@/lib/utils";
import type { KnowledgeCardDTO } from "@/lib/contracts";

/** 设置 Tab：入团二维码、口令、知识库、一键重置、创建新团 */
export function SettingsPanel({
  tourCode,
  initialKnowledge,
  onReset,
}: {
  tourCode: string;
  initialKnowledge: KnowledgeCardDTO[];
  onReset: () => void;
}) {
  const [screen, setScreen] = useState<"overview" | "knowledge">("overview");

  if (screen === "knowledge") {
    return (
      <KnowledgePanel
        tourCode={tourCode}
        initialKnowledge={initialKnowledge}
        onBack={() => setScreen("overview")}
      />
    );
  }

  return (
    <section aria-label="团设置" className="space-y-3">
      <h2 className="font-display text-base font-semibold">团设置</h2>

      {/* 入团二维码 */}
      <Card className="flex flex-col items-center gap-2.5 p-5">
        <div className="rounded-2xl bg-card p-3 shadow-card ring-1 ring-qian-100">
          <QRCodeSVG
            value={`https://aqian.demo/join?code=${tourCode}`}
            size={164}
            fgColor="#1f4a5e"
            bgColor="#fffdf6"
            level="M"
          />
        </div>
        <p className="text-sm font-medium">游客入团二维码</p>
        <p className="text-center text-xs leading-relaxed text-ink-faint">
          发到微信群或出示给游客，扫码 3 步进团
          <br />
          团码 <span className="font-mono font-semibold">{tourCode}</span>
        </p>
      </Card>

      {/* 操作列表 */}
      <Card className="divide-y divide-qian-100/70">
        <SettingRow
          icon={PlusCircle}
          title="创建新旅行团"
          desc="选线路模板、设集合信息、生成新二维码"
          href="/guide/new"
          highlight
        />
        <SettingRow
          icon={KeyRound}
          title="修改导游口令"
          desc="出团前设置，游客端永远看不到"
          href="#"
        />
        <SettingRow
          icon={BookOpenCheck}
          title="知识库"
          desc="增删改游客问答会检索的知识卡"
          onClick={() => setScreen("knowledge")}
        />
        <SettingRow
          icon={RotateCcw}
          title={`一键恢复初始 Demo 团`}
          desc={`只重置 ${tourCode}，不影响游园会观众团`}
          onClick={onReset}
        />
        <SettingRow
          icon={LogOut}
          title="退出本团驾驶舱"
          desc="返回团码 / 口令输入页"
          href="/guide"
        />
      </Card>

      <p className="text-center text-[11px] leading-relaxed text-ink-faint">
        团结束 24 小时后，成员状态自动删除/匿名化
      </p>
    </section>
  );
}

function SettingRow({
  icon: Icon,
  title,
  desc,
  href,
  onClick,
  highlight,
}: {
  icon: typeof QrCode;
  title: string;
  desc: string;
  href?: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const inner = (
    <>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl",
          highlight
            ? "bg-qian-700 text-white"
            : "bg-qian-50 text-qian-600"
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-ink-faint">
          {desc}
        </span>
      </span>
      <ChevronRight className="size-4.5 shrink-0 text-ink-faint" />
    </>
  );

  const cls =
    "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-qian-50/60";

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
