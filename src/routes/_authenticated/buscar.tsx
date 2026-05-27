import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/buscar")({ component: BuscarPage });

function BuscarPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const { data = [] } = useQuery({
    enabled: q.trim().length >= 2,
    queryKey: ["search-users", q],
    queryFn: async () => {
      const term = `%${q.trim()}%`;
      const { data } = await supabase.from("profiles")
        .select("id,display_name,username,avatar_url,xp,bio")
        .or(`display_name.ilike.${term},username.ilike.${term}`)
        .limit(30);
      return (data ?? []).filter((u) => u.id !== user?.id);
    },
  });

  const follow = async (id: string) => {
    const { error } = await supabase.from("followers").insert({ follower_id: user!.id, following_id: id });
    if (error) return toast.error(error.message);
    toast.success("Ahora sigues a esta persona");
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-3xl mx-auto space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Search className="h-6 w-6 text-primary" /> Buscar usuarios</h1>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o @usuario…" className="bg-surface/40" />
      <div className="space-y-2">
        {q.trim().length < 2 && <p className="text-sm text-muted-foreground">Escribe al menos 2 caracteres.</p>}
        {q.trim().length >= 2 && data.length === 0 && <p className="text-sm text-muted-foreground">Sin resultados.</p>}
        {(data as any[]).map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-card p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={u.avatar_url ?? undefined} />
              <AvatarFallback>{(u.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{u.display_name ?? "Usuario"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{u.username ? `@${u.username}` : ""} · Nivel {Math.max(1, Math.floor((u.xp ?? 0) / 50) + 1)}</p>
            </div>
            <Button size="sm" onClick={() => follow(u.id)} className="bg-gradient-primary">
              <UserPlus className="mr-1 h-3.5 w-3.5" /> Seguir
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
