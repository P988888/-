"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Pencil,
  BookOpenCheck,
  Loader2,
  CircleHelp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createKnowledgeCard,
  deleteKnowledgeCard,
  listKnowledgeCards,
  updateKnowledgeCard,
  type KnowledgeCardInput,
} from "@/actions/knowledge-actions";
import type { KnowledgeCardDTO } from "@/lib/contracts";

const categoryLabel: Record<KnowledgeCardDTO["category"], string> = {
  culture: "文化故事",
  facility: "附近设施",
  notice: "公告提醒",
};
const categoryVariant: Record<KnowledgeCardDTO["category"], "pine" | "moss" | "default"> = {
  culture: "pine",
  facility: "moss",
  notice: "default",
};
const statusMeta: Record<KnowledgeCardDTO["status"], { label: string; cls: string }> = {
  verified: { label: "已审核", cls: "border-moss-500/30 bg-moss-100/60 text-moss-700" },
  draft: { label: "草稿", cls: "border-qian-200 bg-qian-50 text-qian-600" },
  expired: { label: "已过期", cls: "border-cinnabar-500/30 bg-cinnabar-50 text-cinnabar-700" },
};

function toInput(card?: KnowledgeCardDTO | null): KnowledgeCardInput {
  return {
    category: card?.category ?? "culture",
    stageKey: card?.stageKey ?? "",
    title: card?.title ?? "",
    contentZhShort: card?.contentZhShort ?? "",
    contentZhDeep: card?.contentZhDeep ?? "",
    contentEnShort: card?.contentEnShort ?? "",
    contentEnDeep: card?.contentEnDeep ?? "",
    keywords: card?.keywords ?? [],
    dontSay: card?.dontSay ?? [],
    sourceTitle: card?.sourceTitle ?? "",
    sourceUrl: card?.sourceUrl ?? "",
    status: card?.status === "draft" ? "draft" : "verified",
  };
}

type Screen = "list" | "edit";

export function KnowledgePanel({
  tourCode,
  initialKnowledge,
  onBack,
}: {
  tourCode: string;
  initialKnowledge: KnowledgeCardDTO[];
  onBack: () => void;
}) {
  const [cards, setCards] = useState<KnowledgeCardDTO[]>(initialKnowledge);
  const [screen, setScreen] = useState<Screen>("list");
  const [editing, setEditing] = useState<KnowledgeCardDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function refresh() {
    setCards(await listKnowledgeCards(tourCode));
  }

  function startEdit(card?: KnowledgeCardDTO) {
    setEditing(card ?? null);
    setError("");
    setScreen("edit");
  }

  async function save(input: KnowledgeCardInput, id?: string) {
    setBusy(true);
    setError("");
    const result = id
      ? await updateKnowledgeCard(tourCode, id, input)
      : await createKnowledgeCard(tourCode, input);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setScreen("list");
    await refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    const result = await deleteKnowledgeCard(tourCode, id);
    setBusy(false);
    if (result.ok) {
      setConfirmDelete(null);
      await refresh();
    } else {
      setError(result.error);
    }
  }

  if (screen === "edit") {
    return (
      <CardForm
        card={editing}
        busy={busy}
        error={error}
        onCancel={() => setScreen("list")}
        onSave={save}
      />
    );
  }

  // —— 列表 ——
  return (
    <section aria-label="知识库管理" className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="返回团设置"
          className="flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-qian-50"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="font-display text-lg font-semibold">知识库</h2>
      </div>
      <p className="-mt-1 px-0.5 text-xs leading-relaxed text-ink-faint">
        游客问阿黔的问题会自动检索这里的「知识卡」回答。导游随时可增删改，写实、标注来源即可；未核验的内容请先存为草稿。
      </p>

      {error && <p role="alert" className="rounded-xl bg-cinnabar-50 px-3 py-2 text-xs text-cinnabar-700">{error}</p>}

      <Button type="button" onClick={() => startEdit()} className="w-full">
        <Plus className="size-4" /> 新增知识卡
      </Button>

      {cards.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-6 text-center">
          <BookOpenCheck className="size-7 text-qian-300" />
          <p className="text-sm font-medium text-ink">还没有知识卡</p>
          <p className="text-xs leading-relaxed text-ink-faint">
            点「新增知识卡」录入第一条，游客问答才会检索这处线路的内容。
          </p>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {cards.map((card) => (
            <li key={card.id}>
              <Card className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={categoryVariant[card.category]}>{categoryLabel[card.category]}</Badge>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", statusMeta[card.status].cls)}>{statusMeta[card.status].label}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-ink">{card.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">{card.contentZhShort || card.contentZhDeep}</p>
                    <p className="mt-1.5 text-[11px] text-ink-faint">来源：{card.sourceTitle}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(card)}
                      aria-label={`编辑「${card.title}」`}
                      className="flex size-9 items-center justify-center rounded-full text-qian-600 hover:bg-qian-50"
                    >
                      <Pencil className="size-4" />
                    </button>
                    {confirmDelete === card.id ? (
                      <button
                        type="button"
                        onClick={() => void remove(card.id)}
                        aria-label="确认删除"
                        className="flex h-9 items-center rounded-full bg-cinnabar-600 px-3 text-xs font-medium text-white"
                      >
                        确认
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(card.id)}
                        aria-label={`删除「${card.title}」`}
                        className="flex size-9 items-center justify-center rounded-full text-cinnabar-600 hover:bg-cinnabar-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {busy && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-faint">
          <Loader2 className="size-3.5 animate-spin" /> 正在同步…
        </p>
      )}

      <p className="flex items-start gap-1.5 px-0.5 text-[11px] leading-relaxed text-ink-faint">
        <CircleHelp className="mt-0.5 size-3.5 shrink-0" />
        只收录由本线路导游确认的事实；涉及会变化的信息（如具体价格、当日演出，改用「公告提醒」并写明核验时间）。
      </p>
    </section>
  );
}

function CardForm({
  card,
  busy,
  error,
  onCancel,
  onSave,
}: {
  card: KnowledgeCardDTO | null;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (input: KnowledgeCardInput, id?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<KnowledgeCardInput>(() => toInput(card));
  const [keywordsText, setKeywordsText] = useState(() => (card?.keywords ?? []).join("，"));
  const [dontSayText, setDontSayText] = useState(() => (card?.dontSay ?? []).join("，"));

  function patch(p: Partial<KnowledgeCardInput>) {
    setForm((f) => ({ ...f, ...p }));
  }

  const field =
    "w-full rounded-2xl border border-qian-200 bg-card px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-faint focus:border-pine-400";

  async function submit() {
    const split = (t: string) => t.split(/[,，、;；]/).map((x) => x.trim()).filter(Boolean);
    const input: KnowledgeCardInput = {
      ...form,
      title: form.title.trim(),
      stageKey: form.stageKey.trim(),
      sourceTitle: form.sourceTitle.trim(),
      sourceUrl: form.sourceUrl.trim(),
      keywords: split(keywordsText).slice(0, 30),
      dontSay: split(dontSayText).slice(0, 20),
    };
    await onSave(input, card?.id);
  }

  return (
    <section aria-label={card ? "编辑知识卡" : "新增知识卡"} className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          aria-label="返回知识库"
          className="flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-qian-50"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="font-display text-lg font-semibold">{card ? "编辑知识卡" : "新增知识卡"}</h2>
      </div>

      <div className="space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">标题（游客能搜到的关键词）</span>
          <input value={form.title} onChange={(e) => patch({ title: e.target.value })} maxLength={80} placeholder="例如：青岩为何是石头城" className={field} />
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">类型</span>
            <select value={form.category} onChange={(e) => patch({ category: e.target.value as KnowledgeCardInput["category"] })} className={field}>
              <option value="culture">文化故事</option>
              <option value="facility">附近设施</option>
              <option value="notice">公告提醒</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">状态</span>
            <select value={form.status} onChange={(e) => patch({ status: e.target.value as KnowledgeCardInput["status"] })} className={field}>
              <option value="verified">已审核（游客可检索）</option>
              <option value="draft">草稿（暂不对外）</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">对应景区/节点（可选）</span>
          <input value={form.stageKey} onChange={(e) => patch({ stageKey: e.target.value })} maxLength={40} placeholder="例如：beijie" className={field} />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">中文·简短回答</span>
          <textarea value={form.contentZhShort} onChange={(e) => patch({ contentZhShort: e.target.value })} rows={2} maxLength={1000} placeholder="一句话标准回答" className={cn(field, "resize-none")} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">中文·深度故事（游客选择听长文时）</span>
          <textarea value={form.contentZhDeep} onChange={(e) => patch({ contentZhDeep: e.target.value })} rows={4} maxLength={2000} placeholder="展开讲讲历史、来源与细节…" className={cn(field, "resize-none")} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">英文·简短回答</span>
          <textarea value={form.contentEnShort} onChange={(e) => patch({ contentEnShort: e.target.value })} rows={2} maxLength={1000} placeholder="Short English answer" className={cn(field, "resize-none")} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">英文·深度故事</span>
          <textarea value={form.contentEnDeep} onChange={(e) => patch({ contentEnDeep: e.target.value })} rows={4} maxLength={2000} placeholder="Longer English story…" className={cn(field, "resize-none")} />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">检索关键词（逗号分隔，中英均可）</span>
          <input value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} placeholder="石头，石板，为什么，stone, history" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">注意事项 / 勿说（逗号分隔，可选）</span>
          <input value={dontSayText} onChange={(e) => setDontSayText(e.target.value)} placeholder="不夸大民族传说…" className={field} />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">来源标注</span>
          <input value={form.sourceTitle} onChange={(e) => patch({ sourceTitle: e.target.value })} maxLength={120} placeholder="例如：《青岩镇志》· 周导已审核" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">来源链接（可选）</span>
          <input value={form.sourceUrl} onChange={(e) => patch({ sourceUrl: e.target.value })} maxLength={240} placeholder="https://…" className={field} />
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl bg-cinnabar-50 px-3 py-2 text-xs text-cinnabar-700">{error}</p>}

      <div className="flex gap-2.5">
        <Button type="button" variant="outline" size="lg" onClick={onCancel} className="flex-1">取消</Button>
        <Button type="button" size="lg" onClick={() => void submit()} disabled={busy || !form.title.trim()} className="flex-1">
          {busy ? (<><Loader2 className="size-4 animate-spin" /> 保存中…</>) : "保存"}
        </Button>
      </div>
    </section>
  );
}
