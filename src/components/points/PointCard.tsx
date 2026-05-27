import { MapPin } from "lucide-react";
import { CategoryPill } from "./CategoryPill";
import { RatingStars } from "./RatingStars";
import { usePointModal } from "./PointModalContext";
import { PointImage } from "./PointImage";

export interface PointCardData {
  id: string;
  title: string;
  district: string;
  image_url: string | null;
  avg_rating: number;
  total_reviews: number;
  categories?: { name: string; slug?: string | null; icon?: string | null } | null;
}

export function PointCard({ point }: { point: PointCardData }) {
  const { open } = usePointModal();
  return (
    <article
      onClick={() => open(point.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") open(point.id); }}
      className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-gradient-card text-left shadow-card transition hover:-translate-y-1 hover:shadow-glow-primary"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <PointImage
          src={point.image_url}
          alt={point.title}
          category={point.categories}
          imgClassName="transition duration-700 group-hover:scale-110"
          iconClassName="h-14 w-14"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute left-3 top-3">
          <CategoryPill name={point.categories?.name} />
        </div>
      </div>
      <div className="space-y-1.5 p-4">
        <h3 className="line-clamp-1 font-semibold tracking-tight">{point.title}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> {point.district}
        </div>
        <div className="flex items-center justify-between pt-1">
          <RatingStars value={Number(point.avg_rating) || 0} />
          <span className="text-[11px] text-muted-foreground">
            {point.total_reviews} reseña{point.total_reviews === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </article>
  );
}