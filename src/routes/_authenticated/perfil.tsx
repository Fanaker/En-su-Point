import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Loader2, MapPin, Pencil, Sparkles } from "lucide-react";
import { PointCard, type PointCardData } from "@/components/points/PointCard";
import { LIMA_DISTRICTS } from "@/lib/lima";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { levelFromXp } from "@/lib/levels";
import { AvatarEditor } from "@/components/profile/AvatarEditor";

export const Route = createFileRoute("/_authenticated/perfil")({ component: ProfilePage });

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [draft, setDraft] = useState({ display_name: "", username: "", bio: "", district: "" });

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: myPoints = [] } = useQuery<PointCardData[]>({
    enabled: !!user,
    queryKey: ["my-points", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points")
        .select("id,title,district,image_url,avg_rating,total_reviews,categories(name,slug,icon)")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PointCardData[];
    },
  });

  const { data: favoritePoints = [] } = useQuery<PointCardData[]>({
    enabled: !!user,
    queryKey: ["my-favorite-points", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("saved_places")
        .select("points(id,title,district,image_url,avg_rating,total_reviews,categories(name,slug,icon))")
        .eq("user_id", user!.id).eq("is_favorite", true).order("created_at", { ascending: false });
      return ((data ?? []).map((s: any) => s.points).filter(Boolean)) as PointCardData[];
    },
  });

  const { data: counts } = useQuery({
    enabled: !!user,
    queryKey: ["profile-counts", user?.id],
    queryFn: async () => {
      const [{ count: following }, { count: followers }] = await Promise.all([
        supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", user!.id),
        supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", user!.id),
      ]);
      return { following: following ?? 0, followers: followers ?? 0 };
    },
  });

  useEffect(() => {
    if (profile) {
      setDraft({
        display_name: profile.display_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        district: profile.district ?? "",
      });
    }
  }, [profile]);

  const initials = (profile?.display_name || user?.email || "?").slice(0, 2).toUpperCase();
  const lvl = levelFromXp(profile?.xp ?? 0);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: draft.display_name.trim() || null,
      username: draft.username.trim() || null,
      bio: draft.bio.trim() || null,
      district: draft.district || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    setEditing(false);
    toast.success("Perfil guardado");
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10 space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-card p-6 sm:p-8 shadow-elegant">
        <div className="ambient-glow" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-2 ring-primary/40 shadow-glow-primary">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt="avatar" />
              <AvatarFallback className="bg-surface text-lg">{initials}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => setAvatarOpen(true)}
              className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-white shadow-glow-primary"
              aria-label="Editar foto de perfil"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {profile?.display_name || user?.email?.split("@")[0]}
            </h1>
            {profile?.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
            <div className="mt-2 inline-flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold">Nivel {lvl.level}</span>
              <span className="text-primary">· {lvl.title}</span>
              <span className="text-xs text-muted-foreground">· {lvl.xp} XP</span>
            </div>
            {profile?.bio && <p className="mt-2 max-w-xl text-sm text-foreground/80">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{myPoints.length}</strong> points</span>
              <Link to="/amigos" className="hover:text-primary">
                <strong className="text-foreground">{counts?.followers ?? 0}</strong> seguidores
              </Link>
              <Link to="/amigos" className="hover:text-primary">
                <strong className="text-foreground">{counts?.following ?? 0}</strong> siguiendo
              </Link>
              {profile?.district && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.district}</span>}
            </div>
            <div className="mt-3 max-w-xs">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface/70">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-burgundy-glow transition-[width] duration-700"
                  style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {lvl.xpForNextLevel - lvl.xpIntoLevel} XP para Nivel {lvl.level + 1}
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}
            className="bg-surface/40 border-border">
            <Pencil className="mr-2 h-3.5 w-3.5" /> {editing ? "Cancelar" : "Editar perfil"}
          </Button>
        </div>

        {editing && (
          <div className="relative mt-6 grid gap-4 border-t border-border/60 pt-6 sm:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                maxLength={60} className="mt-2 bg-surface/40" />
            </div>
            <div>
              <Label>Usuario</Label>
              <Input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() })}
                maxLength={24} placeholder="tu_usuario" className="mt-2 bg-surface/40" />
            </div>
            <div className="sm:col-span-2">
              <Label>Bio</Label>
              <Textarea value={draft.bio} maxLength={200} rows={3}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                className="mt-2 bg-surface/40" />
            </div>
            <div>
              <Label>Distrito</Label>
              <Select value={draft.district} onValueChange={(v) => setDraft({ ...draft, district: v })}>
                <SelectTrigger className="mt-2 bg-surface/40"><SelectValue placeholder="Elige tu distrito" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {LIMA_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={save} disabled={saving} className="bg-gradient-primary shadow-glow-primary">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</> : "Guardar cambios"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <Tabs defaultValue="mine" className="w-full">
        <TabsList className="bg-surface/60">
          <TabsTrigger value="mine">Mis Points</TabsTrigger>
          <TabsTrigger value="favorites">Mis Points Favoritos</TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="mt-5">
          {myPoints.length === 0 ? (
            <EmptyState text="Aún no has creado ningún Point." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myPoints.map((p) => <PointCard key={p.id} point={p} />)}
            </div>
          )}
        </TabsContent>
        <TabsContent value="favorites" className="mt-5">
          {favoritePoints.length === 0 ? (
            <EmptyState text="Aún no has marcado favoritos públicos." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favoritePoints.map((p) => <PointCard key={p.id} point={p} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AvatarEditor
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        currentAvatarUrl={profile?.avatar_url ?? null}
        fallback={initials}
        onSaved={() => qc.invalidateQueries({ queryKey: ["profile", user?.id] })}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">{text}</div>
  );
}
