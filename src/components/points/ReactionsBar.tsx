import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EMOJIS = ["🔥", "❤️", "😍", "😋", "🤩", "👌"];

export function ReactionsBar({ pointId, className }: { pointId: string; className?: string }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());

  const load = async () => {
    const { data } = await supabase
      .from("reactions")
      .select("emoji,user_id")
      .eq("point_id", pointId);
    const c: Record<string, number> = {};
    const m = new Set<string>();
    (data ?? []).forEach((r: any) => {
      c[r.emoji] = (c[r.emoji] ?? 0) + 1;
      if (r.user_id === user?.id) m.add(r.emoji);
    });
    setCounts(c);
    setMine(m);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [pointId, user?.id]);

  const toggle = async (emoji: string) => {
    if (!user) return;
    if (mine.has(emoji)) {
      const { error } = await supabase.from("reactions").delete()
        .eq("point_id", pointId).eq("user_id", user.id).eq("emoji", emoji);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("reactions")
        .insert({ point_id: pointId, user_id: user.id, emoji });
      if (error) return toast.error(error.message);
    }
    load();
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {EMOJIS.map((e) => {
        const active = mine.has(e);
        const n = counts[e] ?? 0;
        return (
          <button key={e} onClick={() => toggle(e)} type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition",
              active
                ? "border-primary/60 bg-primary/15 shadow-glow-primary"
                : "border-border bg-surface/40 hover:border-primary/40 hover:bg-surface",
            )}>
            <span className="text-base leading-none">{e}</span>
            {n > 0 && <span className="text-muted-foreground">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}