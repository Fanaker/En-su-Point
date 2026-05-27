import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PointCard, type PointCardData } from "@/components/points/PointCard";
import { MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/u/$username")({ component: PublicProfile });

function PublicProfile() {
  const { username } = Route.useParams();
  const { data: profile } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      return data;
    },
  });
  const { data: points = [] } = useQuery<PointCardData[]>({
    enabled: !!profile?.id,
    queryKey: ["public-points", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("points")
        .select("id,title,district,image_url,avg_rating,total_reviews,categories(name,slug,icon)")
        .eq("created_by", profile!.id).order("created_at", { ascending: false });
      return (data ?? []) as unknown as PointCardData[];
    },
  });
  const { data: favorites = [] } = useQuery<PointCardData[]>({
    enabled: !!profile?.id,
    queryKey: ["public-favorites", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("saved_places")
        .select("points(id,title,district,image_url,avg_rating,total_reviews,categories(name,slug,icon))")
        .eq("user_id", profile!.id).eq("is_favorite", true).order("created_at", { ascending: false });
      return ((data ?? []).map((s: any) => s.points).filter(Boolean)) as PointCardData[];
    },
  });
  if (!profile) return <div className="p-8 text-center text-sm text-muted-foreground">Perfil no encontrado.</div>;
  const level = Math.max(1, Math.floor((profile.xp ?? 0) / 50) + 1);
  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-4 rounded-3xl border border-border/60 bg-gradient-card p-6 shadow-elegant">
        <Avatar className="h-20 w-20 ring-2 ring-primary/40">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg">{(profile.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username} · Nivel {level} · {profile.xp ?? 0} XP</p>
          {profile.bio && <p className="mt-2 max-w-xl text-sm">{profile.bio}</p>}
          {profile.district && <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {profile.district}</p>}
        </div>
      </div>
      <Tabs defaultValue="points">
        <TabsList className="bg-surface/60">
          <TabsTrigger value="points">Sus Points</TabsTrigger>
          <TabsTrigger value="favorites">Points Favoritos</TabsTrigger>
        </TabsList>
        <TabsContent value="points" className="mt-4">
          {points.length === 0 ? <p className="text-sm text-muted-foreground">Aún no ha publicado.</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{points.map((p) => <PointCard key={p.id} point={p} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="favorites" className="mt-4">
          {favorites.length === 0 ? <p className="text-sm text-muted-foreground">Aún no tiene favoritos públicos.</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((p) => <PointCard key={p.id} point={p} />)}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}