import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, UserPlus, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/amigos")({ component: AmigosPage });

function AmigosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: following = [] } = useQuery({
    enabled: !!user,
    queryKey: ["following", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("followers")
        .select("following_id, profile:following_id(display_name,username,avatar_url,xp)")
        .eq("follower_id", user!.id);
      return data ?? [];
    },
  });

  const { data: followers = [] } = useQuery({
    enabled: !!user,
    queryKey: ["followers", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("followers")
        .select("follower_id, profile:follower_id(display_name,username,avatar_url,xp)")
        .eq("following_id", user!.id);
      return data ?? [];
    },
  });

  const unfollow = async (id: string) => {
    await supabase.from("followers").delete().eq("follower_id", user!.id).eq("following_id", id);
    qc.invalidateQueries({ queryKey: ["following"] });
    toast.success("Dejaste de seguir");
  };
  const follow = async (id: string) => {
    await supabase.from("followers").insert({ follower_id: user!.id, following_id: id });
    qc.invalidateQueries({ queryKey: ["following"] });
    toast.success("Ahora sigues a esta persona");
  };

  const followingIds = new Set((following as any[]).map((f) => f.following_id));

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-3xl mx-auto space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Users className="h-6 w-6 text-primary" /> Amigos</h1>
      <Link to="/buscar" className="inline-flex items-center gap-2 rounded-xl bg-primary/15 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25">
        <UserPlus className="h-4 w-4" /> Buscar usuarios
      </Link>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Sigues a ({following.length})</h2>
        <div className="space-y-2">
          {following.length === 0 && <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">Aún no sigues a nadie.</p>}
          {(following as any[]).map((f) => (
            <UserRow key={f.following_id} profile={f.profile} username={f.profile?.username}
              action={<Button size="sm" variant="outline" onClick={() => unfollow(f.following_id)}>
                <UserMinus className="mr-1 h-3.5 w-3.5" /> Dejar de seguir
              </Button>} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Te siguen ({followers.length})</h2>
        <div className="space-y-2">
          {followers.length === 0 && <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">Aún nadie te sigue.</p>}
          {(followers as any[]).map((f) => (
            <UserRow key={f.follower_id} profile={f.profile} username={f.profile?.username}
              action={followingIds.has(f.follower_id)
                ? <span className="text-xs text-muted-foreground">Se siguen</span>
                : <Button size="sm" onClick={() => follow(f.follower_id)} className="bg-gradient-primary">
                    <UserPlus className="mr-1 h-3.5 w-3.5" /> Seguir
                  </Button>} />
          ))}
        </div>
      </section>
    </div>
  );
}

function UserRow({ profile, username, action }: { profile: any; username?: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-card p-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={profile?.avatar_url ?? undefined} />
        <AvatarFallback>{(profile?.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{profile?.display_name ?? "Usuario"}</p>
        <p className="truncate text-[11px] text-muted-foreground">{username ? `@${username}` : ""} · Nivel {Math.max(1, Math.floor((profile?.xp ?? 0) / 50) + 1)}</p>
      </div>
      {action}
    </div>
  );
}
