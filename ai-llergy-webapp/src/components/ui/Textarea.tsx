import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ error, className, rows = 3, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full bg-surface text-text rounded-xl border px-4 py-2.5 text-sm placeholder:text-text-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 resize-y",
          error ? "border-danger focus:ring-danger/20 focus:border-danger" : "border-border",
          className
        )}
        {...props}
      />
    );
  }
);
