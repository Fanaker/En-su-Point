import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  size = 14,
  onChange,
  className,
}: {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
  className?: string;
}) {
  const interactive = !!onChange;
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= Math.round(value);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(i)}
            className={cn(
              "transition",
              interactive && "cursor-pointer hover:scale-110",
              !interactive && "cursor-default"
            )}
            aria-label={`${i} estrellas`}
          >
            <Star
              style={{ width: size, height: size }}
              className={cn(
                active ? "fill-primary text-primary drop-shadow-[0_0_6px_oklch(0.7_0.2_260)]" : "text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}