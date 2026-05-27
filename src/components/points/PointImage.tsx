import { useState } from "react";
import {
  MapPin, Utensils, Mic, Hotel, PartyPopper, Coffee, Beer, Building, Pizza,
  ShoppingBag, Sparkles, Camera, Drumstick, Salad,
} from "lucide-react";
import { categoryColor } from "@/lib/mapbox";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = {
  utensils: Utensils, mic: Mic, hotel: Hotel, "party-popper": PartyPopper,
  coffee: Coffee, beer: Beer, building: Building, pizza: Pizza,
  "shopping-bag": ShoppingBag, sparkles: Sparkles, camera: Camera,
  "map-pin": MapPin, drumstick: Drumstick, salad: Salad,
};

export function PointImage({
  src,
  alt,
  category,
  className,
  iconClassName,
  imgClassName,
}: {
  src?: string | null;
  alt: string;
  category?: { slug?: string | null; icon?: string | null } | null;
  className?: string;
  iconClassName?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const Icon = ICONS[category?.icon || "map-pin"] || MapPin;
  const color = categoryColor(category?.slug);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn("h-full w-full object-cover", imgClassName)}
      />
    );
  }

  return (
    <div
      className={cn("flex h-full w-full items-center justify-center overflow-hidden", className)}
      style={{
        background: `radial-gradient(circle at 50% 30%, ${color}55 0%, oklch(0.18 0.04 260) 42%, oklch(0.11 0.025 260) 100%)`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0,transparent_45%,oklch(0_0_0_/_0.25)_100%)]" />
      <Icon
        className={cn("relative h-16 w-16 text-foreground/90 drop-shadow-[0_0_20px_oklch(0.55_0.21_264_/_0.85)]", iconClassName)}
        strokeWidth={1.35}
      />
    </div>
  );
}