import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-qian-200 bg-qian-50 text-qian-700",
        solid: "border-transparent bg-qian-700 text-white",
        cinnabar: "border-cinnabar-500/30 bg-cinnabar-50 text-cinnabar-700",
        moss: "border-moss-600/25 bg-moss-100 text-moss-700",
        pine: "border-pine-500/30 bg-pine-100 text-pine-600",
        outline: "border-qian-200 text-ink-soft",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
