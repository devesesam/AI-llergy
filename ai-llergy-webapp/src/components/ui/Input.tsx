import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

const FIELD_BASE =
  "w-full bg-surface text-text rounded-xl border px-4 py-2.5 text-sm placeholder:text-text-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, icon, className, ...props },
  ref
) {
  const field = (
    <input
      ref={ref}
      className={cn(
        FIELD_BASE,
        error ? "border-danger focus:ring-danger/20 focus:border-danger" : "border-border",
        icon ? "pl-11" : null,
        className
      )}
      {...props}
    />
  );

  if (!icon) return field;

  return (
    <div className="relative">
      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-text-muted pointer-events-none">
        {icon}
      </span>
      {field}
    </div>
  );
});
