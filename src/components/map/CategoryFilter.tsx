import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Utensils, Mic, Hotel, PartyPopper, Coffee, Beer, Building, Pizza,
  ShoppingBag, Sparkles, Camera, MapPin, LayoutGrid,
} from "lucide-react";

const ICONS: Record<string, any> = {
  utensils: Utensils, mic: Mic, hotel: Hotel, "party-popper": PartyPopper,
  coffee: Coffee, beer: Beer, building: Building, pizza: Pizza,
  "shopping-bag": ShoppingBag, sparkles: Sparkles, camera: Camera, "map-pin": MapPin,
};

interface Cat { id: string; name: string; slug: string; icon: string | null }

export function CategoryFilter({
  selected, onChange, className,
}: {
  selected: string | null;
  onChange: (slug: string | null) => void;
  className?: string;
}) {
  const { data: categories = [] } = useQuery<Cat[]>({
    queryKey: ["categories", "filter"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug,icon").order("name");
      return (data ?? []) as Cat[];
    },
  });

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]", className)}>
      <Chip active={selected === null} onClick={() => onChange(null)} icon={LayoutGrid} label="Todos" />
      {categories.map((c) => {
        const Icon = ICONS[c.icon || "map-pin"] || MapPin;
        return (
          <Chip key={c.id}
            active={selected === c.slug}
            onClick={() => onChange(selected === c.slug ? null : c.slug)}
            icon={Icon} label={c.name} />
        );
      })}
    </div>
  );
}

function Chip({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-primary/60 bg-primary/20 text-primary shadow-glow-primary"
          : "border-border/60 bg-surface/40 text-foreground/70 hover:bg-surface/70 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}