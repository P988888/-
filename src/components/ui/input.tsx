import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full rounded-2xl border border-qian-200 bg-card px-4 text-base text-ink shadow-card outline-none transition placeholder:text-ink-faint focus:border-qian-400 focus:ring-2 focus:ring-qian-100",
        className
      )}
      {...props}
    />
  );
}

export { Input };
