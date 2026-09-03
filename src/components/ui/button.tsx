import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-cyan-500/20",
        cyber:
          "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-500/25 border border-sky-400/30 hover:shadow-sky-500/40",
        destructive:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-500 hover:shadow-rose-600/30",
        outline:
          "border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-600 text-slate-200 hover:text-white shadow-sm",
        secondary:
          "bg-slate-800 text-slate-100 hover:bg-slate-700/80 border border-slate-700/60",
        ghost: "hover:bg-slate-800/60 hover:text-slate-100 text-slate-300",
        link: "text-sky-400 underline-offset-4 hover:underline hover:text-sky-300",
        success:
          "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 border border-emerald-400/30",
        warning:
          "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/25 border border-amber-400/30",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
