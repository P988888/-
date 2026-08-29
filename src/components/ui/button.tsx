import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-medium transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-qian-400",
  {
    variants: {
      variant: {
        default: "bg-qian-700 text-white shadow-card hover:bg-qian-600",
        cinnabar: "bg-cinnabar-600 text-white shadow-card hover:bg-cinnabar-500",
        outline:
          "border border-qian-200 bg-card text-qian-700 shadow-card hover:bg-qian-50",
        ghost: "text-qian-700 hover:bg-qian-50",
        pine: "bg-pine-500 text-white shadow-card hover:bg-pine-600",
        soft: "bg-qian-100 text-qian-800 hover:bg-qian-200",
      },
      size: {
        default: "h-11 px-5 text-[15px]",
        sm: "h-9 px-3.5 text-sm rounded-xl",
        /* H5 核心按钮 ≥44px */
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
