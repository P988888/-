"use client";

import { useEffect, useRef } from "react";
import { BookOpenCheck } from "lucide-react";
import { AqianAvatar } from "@/components/aqian-avatar";
import type { ChatMessage } from "@/lib/demo";

/** 对话区：阿黔的每条事实性回答都带来源标注 */
export function ChatPanel({
  messages,
  typing,
}: {
  messages: ChatMessage[];
  typing: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typing]);

  return (
    <div className="space-y-3.5">
      {messages.map((m) =>
        m.role === "me" ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[80%] rounded-3xl rounded-br-lg bg-qian-700 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-card">
              {m.text}
            </div>
          </div>
        ) : (
          <div key={m.id} className="flex items-start gap-2.5">
            <AqianAvatar size={32} className="mt-0.5" />
            <div className="max-w-[82%]">
              <div className="rounded-3xl rounded-tl-lg border border-qian-100/80 bg-card px-4 py-2.5 text-[15px] leading-relaxed shadow-card">
                {m.text}
              </div>
              {m.source && (
                <p className="mt-1.5 flex items-center gap-1 pl-1 text-[11px] text-ink-faint">
                  <BookOpenCheck className="size-3.5 text-pine-500" />
                  {m.source}
                </p>
              )}
            </div>
          </div>
        )
      )}

      {typing && (
        <div className="flex items-start gap-2.5">
          <AqianAvatar size={32} className="mt-0.5" />
          <div className="flex items-center gap-1 rounded-3xl rounded-tl-lg border border-qian-100/80 bg-card px-4 py-3 shadow-card">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="typing-dot size-1.5 rounded-full bg-qian-400"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
