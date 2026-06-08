import { cn } from "@/lib/cn";

type Variant = "success" | "warning" | "danger" | "neutral" | "brand";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-muted-bg text-text-muted",
  brand: "bg-primary/15 text-[#9a7400]",
};

const SIZES: Record<Size, string> = {
  sm: "text-[11px] px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  size = "md",
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
