import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = e.target;
      textarea.style.height = "auto";

      const style = window.getComputedStyle(textarea);
      const borderHeight = parseInt(style.borderTopWidth) + parseInt(style.borderBottomWidth);
      const paddingHeight = parseInt(style.paddingTop) + parseInt(style.paddingBottom);

      const lineHeight = parseInt(style.lineHeight);
      const maxHeight = props.maxRows ? lineHeight * props.maxRows + borderHeight + paddingHeight : Infinity;

      const newHeight = Math.min(textarea.scrollHeight + borderHeight, maxHeight);

      textarea.style.height = `${newHeight}px`;
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm shadow-black/5 transition-shadow placeholder:text-gray-500/70 dark:placeholder:text-gray-400/70 focus:border-primary/20 focus:outline-none focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white",
          className,
        )}
        ref={ref}
        onChange={(e) => {
          handleInput(e);
          props.onChange?.(e);
        }}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };