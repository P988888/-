"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, LocateFixed } from "lucide-react";
import { searchPoi, type Poi } from "@/lib/poi";

/**
 * 集合点定位搜索框：输入地名（如「黄果树瀑布」），
 * 自动弹出 POI 候选（名称 + 地址 + 坐标）。
 * 数据源见 src/lib/poi.ts —— 内置演示集 / 高德 Web 服务一键切换。
 */
export function PoiInput({
  value,
  onChangeText,
  onSelect,
  placeholder,
}: {
  value: string;
  /** 自由输入（未选中 POI 时） */
  onChangeText: (text: string) => void;
  /** 选中候选：带回完整定位信息 */
  onSelect: (poi: Poi) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<Poi[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 输入防抖搜索
  useEffect(() => {
    if (!value.trim()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      try {
        const list = await searchPoi(value);
        setResults(list);
      } catch (error) {
        setResults([]);
        setSearchError(error instanceof Error ? error.message : "高德地点搜索暂时不可用");
      } finally {
        setLoading(false);
        setOpen(true);
      }
    }, 280);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  // 点击外部收起
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-qian-400" />
        <input
          value={value}
          onChange={(e) => {
            if (!e.target.value.trim()) { setResults([]); setOpen(false); }
            onChangeText(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "搜索地点，如：黄果树瀑布"}
          aria-label="集合点搜索"
          className="h-10 w-full rounded-2xl border border-qian-200 bg-card pl-9 pr-9 text-sm text-ink shadow-card outline-none placeholder:text-ink-faint focus:border-qian-400"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-qian-400" />
        )}
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-2xl border border-qian-100 bg-card shadow-lift">
          {results.length > 0 ? (
            <ul className="max-h-56 overflow-y-auto">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(p);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-qian-50"
                  >
                    <LocateFixed className="mt-0.5 size-4 shrink-0 text-qian-500" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {p.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-faint">
                        {p.address}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-ink-faint/80">
                        {p.location.lng.toFixed(4)}, {p.location.lat.toFixed(4)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !loading && (
              <p className="px-3.5 py-3 text-xs leading-relaxed text-ink-faint">
                {searchError
                  ? `高德搜索失败：${searchError}。请稍后重试。`
                  : `高德未找到「${value}」的可定位地点，可换用“景区名 + 景点名”重新搜索。`}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
