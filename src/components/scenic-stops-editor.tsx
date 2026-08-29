"use client";

import { ChevronDown, Footprints, Plus, X } from "lucide-react";
import { useState } from "react";
import { PoiInput } from "@/components/poi-input";
import type { ScenicStop } from "@/lib/demo";
import type { Poi } from "@/lib/poi";

/**
 * 景区内游览点编辑器：集合点是路线起点，导游只需按真实游览顺序点选景点。
 * 不把景区内部步行点混进景区间的车行节点，避免出现“车开进步道”的错误路线。
 */
export function ScenicStopsEditor({
  stops,
  onChange,
}: {
  stops: ScenicStop[];
  onChange: (stops: ScenicStop[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(stops.length > 0);
  function addPoi(poi: Poi) {
    if (stops.some((stop) => stop.name === poi.name) || stops.length >= 8) return;
    onChange([...stops, { name: poi.name, address: poi.address, location: poi.location }]);
    setQuery("");
  }

  return (
    <div className="rounded-2xl border border-pine-500/20 bg-pine-100/35 p-2.5">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 rounded-xl px-0.5 py-1 text-left"
      >
        <Footprints className="size-4 shrink-0 text-pine-700" />
        <span className="min-w-0 flex-1 text-xs font-semibold text-pine-800">
          {stops.length > 0 ? `该节点内步行点（${stops.length} 个）` : "补充该节点内步行点（可选）"}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-pine-700 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && <>
        <p className="mt-1 px-0.5 text-[11px] leading-relaxed text-pine-700/80">
          仅在同一景区内还需细分步行路线时添加；如果下方已另建独立游览节点，就无需重复填写。
        </p>

      {stops.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {stops.map((stop, index) => (
            <li key={`${stop.name}-${index}`} className="flex items-center gap-2 rounded-xl bg-card/75 px-2.5 py-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-pine-700 text-[10px] font-semibold text-white">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{stop.name}</span>
              <button
                type="button"
                aria-label={`移除景点 ${stop.name}`}
                onClick={() => onChange(stops.filter((_, itemIndex) => itemIndex !== index))}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition hover:bg-cinnabar-50 hover:text-cinnabar-700"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {stops.length < 8 ? (
        <div className="mt-3">
          <PoiInput
            value={query}
            onChangeText={setQuery}
            onSelect={addPoi}
            placeholder={stops.length ? "继续添加下一步行点" : "搜索该节点内景点，如：水帘洞"}
          />
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-pine-700/75">
            <Plus className="size-3" /> 最多添加 8 个步行点；不添加不会影响当前游览节点。
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[10px] text-pine-700/75">景区内路线最多支持 8 个步行点。</p>
      )}
      </>}
    </div>
  );
}
