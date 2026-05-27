import { cn } from "@/lib/utils";

export function CategoryPill({ name, className }: { name?: string | null; className?: string }) {
  if (!name) return null;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary backdrop-blur",
      className
    )}>
      {name}
    </span>
  );
}