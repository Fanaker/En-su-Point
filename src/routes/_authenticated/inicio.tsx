import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Users, MapPin, TrendingUp, Loader2, House } from "lucide-react";
import { PointCard, type PointCardData } from "@/components/points/PointCard";
import { usePointModal } from "@/components/points/PointModalContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { categoryColor } from "@/lib/mapbox";
import type { MapboxPoint } from "@/components/map/MapboxMap";
import { CategoryFilter } from "@/components/map/CategoryFilter";
import { HomeLocationDialog } from "@/components/home/HomeLocationDialog";
import { Pencil } from "lucide-react";

const MapboxMap = lazy(() => import("@/components/map/MapboxMap"));

export const Route = createFileRoute("/_authenticated/inicio")({ component: HomePage });

function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180, lat2 = (b[0] * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function useGeolocation() {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [denied, setDenied] = useState(false);

  const ask = () => {
    if (!navigator.geolocation) { setDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords([p.coords.latitude, p.coords.longitude]),
      () => setDenied(true),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  useEffect(() => { ask(); }, []);
  return { coords, denied, ask };
}

function HomePage() {
  const { user } = useAuth();
  const name = (user?.user_metadata?.display_name as string) || user?.email?.split("@")[0] || "Explorador";
  const { open: openPoint } = usePointModal();
  const { coords, denied, ask } = useGeolocation();
  const [filterSlug, setFilterSlug] = useState<string | null>(null);
  const [nearMode, setNearMode] = useState<"here" | "home">("here");
  const [homeDialogOpen, setHomeDialogOpen] = useState(false);

  // All points with coords for map
  const { data: mapPoints = [] } = useQuery<MapboxPoint[]>({
    queryKey: ["points", "map-home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("points")
        .select("id,title,district,latitude,longitude,image_url,avg_rating,total_reviews,categories(slug)")
        .not("latitude", "is", null).not("longitude", "is", null);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({ ...p, category_slug: p.categories?.slug ?? null }));
    },
  });

  const { data: profile, refetch: refetchProfile } = useQuery<any>({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("home_address,home_district,home_latitude,home_longitude")
        .eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  // Trending (more reviews)
  const { data: trending = [] } = useQuery<any[]>({
    queryKey: ["points", "trending"],
    queryFn: async () => {
      const { data, error } = await supabase.from("points")
        .select("id,title,district,image_url,avg_rating,total_reviews,categories(name,slug,icon)")
        .order("total_reviews", { ascending: false }).limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Friends activity
  const { data: friendsActivity = [] } = useQuery<any[]>({
    enabled: !!user,
    queryKey: ["friends-activity", user?.id],
    queryFn: async () => {
      const { data: follows } = await supabase.from("followers")
        .select("following_id").eq("follower_id", user!.id);
      const ids = (follows ?? []).map((f) => f.following_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("points")
        .select("id,title,district,image_url,avg_rating,total_reviews,created_by,categories(name,slug,icon)")
        .in("created_by", ids).order("created_at", { ascending: false }).limit(5);
      const rows = data ?? [];
      const authorIds = Array.from(new Set(rows.map(r => r.created_by).filter(Boolean) as string[]));
      let profMap: Record<string, any> = {};
      if (authorIds.length) {
        const { data: profs } = await supabase.from("profiles")
          .select("id,display_name,avatar_url,username").in("id", authorIds);
        profMap = Object.fromEntries((profs ?? []).map(p => [p.id, p]));
      }
      return rows.map(r => ({ ...r, profiles: profMap[r.created_by!] ?? null }));
    },
  });

  // Recent
  const { data: recent = [] } = useQuery<PointCardData[]>({
    queryKey: ["points", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("points")
        .select("id,title,district,image_url,avg_rating,total_reviews,categories(name,slug,icon)")
        .order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as PointCardData[];
    },
  });

  // Near me (computed client-side)
  const nearMe = useMemo(() => {
    if (!coords) return [];
    return mapPoints
      .map((p) => ({ ...p, distance: distanceKm(coords, [p.latitude, p.longitude]) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }, [coords, mapPoints]);

  const nearHome = useMemo(() => {
    if (profile?.home_latitude == null || profile?.home_longitude == null) return [];
    return mapPoints
      .map((p) => ({ ...p, distance: distanceKm([profile.home_latitude, profile.home_longitude], [p.latitude, p.longitude]) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }, [profile, mapPoints]);

  const filteredMapPoints = useMemo(
    () => filterSlug ? mapPoints.filter((p) => p.category_slug === filterSlug) : mapPoints,
    [filterSlug, mapPoints],
  );

  const homePin = profile?.home_latitude != null && profile?.home_longitude != null
    ? { lat: profile.home_latitude as number, lng: profile.home_longitude as number }
    : null;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 space-y-6">
      {/* Hero greeting compact */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hola, <span className="text-gradient">{name}</span>
          </h1>
          <p className="text-sm text-muted-foreground">¿Qué point secreto descubres hoy?</p>
        </div>
        {denied && (
          <Button onClick={ask} variant="outline" size="sm" className="bg-surface/40 border-border">
            <MapPin className="mr-2 h-3.5 w-3.5" /> Activar ubicación
          </Button>
        )}
      </div>

      {/* Row 1: Map + sidebars */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <CategoryFilter selected={filterSlug} onChange={setFilterSlug} />
          <div className="relative h-[480px] overflow-hidden rounded-3xl border border-border/60 shadow-elegant">
            <Suspense fallback={<div className="flex h-full items-center justify-center bg-surface/40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
              <MapboxMap points={filteredMapPoints} onSelect={(p) => openPoint(p.id)} homePin={homePin} />
            </Suspense>
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/70 px-3 py-1 text-[11px] font-medium backdrop-blur">
              {filteredMapPoints.length} points {filterSlug ? "filtrados" : "en Lima"}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <SideCard
            title="Tendencias del mes"
            icon={<Flame className="h-4 w-4 text-burgundy-glow" />}
            href="/explorar"
          >
            {trending.length === 0 ? (
              <EmptyMini text="Aún sin tendencias." />
            ) : (
              trending.map((p) => (
                <MiniRow key={p.id} point={p} onClick={() => openPoint(p.id)} />
              ))
            )}
          </SideCard>

          <SideCard
            title="Entre amigos"
            icon={<Users className="h-4 w-4 text-primary" />}
            href="/amigos"
          >
            {friendsActivity.length === 0 ? (
              <EmptyMini text={user ? "Sigue a alguien para ver su actividad." : ""} />
            ) : (
              friendsActivity.map((p) => (
                <FriendRow key={p.id} point={p} onClick={() => openPoint(p.id)} />
              ))
            )}
          </SideCard>
        </div>
      </div>

      {/* Row 2: Recent + Near me */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <TrendingUp className="h-4 w-4 text-primary" /> Nuevos puntos recomendados
            </h2>
            <Link to="/explorar" className="text-xs font-medium text-primary hover:underline">Ver más</Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay puntos. ¡Crea el primero!</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recent.slice(0, 8).map((p) => <PointCard key={p.id} point={p} />)}
            </div>
          )}
        </section>

        <SideCard title={nearMode === "home" ? "Cerca de Mi Hogar" : "Cerca de ti"} icon={nearMode === "home" ? <House className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-primary" />} href="/explorar">
          <div className="mb-2 grid grid-cols-2 rounded-xl bg-surface/50 p-1 text-xs">
            <button onClick={() => setNearMode("here")} className={`rounded-lg px-2 py-1.5 ${nearMode === "here" ? "bg-primary/20 text-foreground" : "text-muted-foreground"}`}>Cerca de ti</button>
            <button onClick={() => setNearMode("home")} className={`rounded-lg px-2 py-1.5 ${nearMode === "home" ? "bg-primary/20 text-foreground" : "text-muted-foreground"}`}>Mi Hogar</button>
          </div>
          {nearMode === "here" ? (
            <>
              {!coords && !denied && <p className="py-3 text-xs text-muted-foreground">Detectando tu ubicación…</p>}
              {denied && <button onClick={ask} className="w-full rounded-xl bg-primary/10 px-3 py-3 text-left text-xs text-foreground/80 hover:bg-primary/20">Activa la ubicación para ver lugares cerca de ti.</button>}
              {coords && nearMe.length === 0 && <EmptyMini text="No hay points con coordenadas todavía." />}
              {coords && nearMe.map((p) => <NearRow key={p.id} point={p} onClick={() => openPoint(p.id)} />)}
            </>
          ) : profile?.home_latitude == null ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Marca Mi Hogar en el mapa para descubrir points cerca. Ubicación privada.</p>
              <Button size="sm" onClick={() => setHomeDialogOpen(true)} className="w-full bg-gradient-primary shadow-glow-primary">
                <House className="mr-2 h-4 w-4" /> Configurar Mi Hogar
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-[11px] text-muted-foreground">Desde {profile.home_address}</p>
                <button onClick={() => setHomeDialogOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-surface/60 px-2 py-0.5 text-[10px] text-primary hover:bg-surface/80">
                  <Pencil className="h-3 w-3" /> Editar
                </button>
              </div>
              {nearHome.length === 0 && <EmptyMini text="No hay points cerca de casa todavía." />}
              {nearHome.map((p) => <NearRow key={p.id} point={p} onClick={() => openPoint(p.id)} />)}
            </>
          )}
        </SideCard>
      </div>

      <HomeLocationDialog
        open={homeDialogOpen}
        onOpenChange={setHomeDialogOpen}
        initial={profile ? {
          address: profile.home_address ?? null,
          district: profile.home_district ?? null,
          latitude: profile.home_latitude ?? null,
          longitude: profile.home_longitude ?? null,
        } : null}
        onSaved={() => refetchProfile()}
      />
    </div>
  );
}

function SideCard({ title, icon, href, children }: { title: string; icon: React.ReactNode; href: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-gradient-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold">{icon}{title}</h3>
        <Link to={href} className="text-[11px] font-medium text-primary hover:underline">Ver más</Link>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyMini({ text }: { text: string }) {
  return text ? <p className="py-3 text-xs text-muted-foreground">{text}</p> : null;
}

function MiniRow({ point, onClick }: { point: any; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface/60">
      <Thumb p={point} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{point.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{point.categories?.name} · {point.district}</p>
      </div>
      <span className="text-[11px] font-semibold text-primary">★ {Number(point.avg_rating).toFixed(1)}</span>
    </button>
  );
}

function FriendRow({ point, onClick }: { point: any; onClick: () => void }) {
  const author = point.profiles;
  return (
    <button onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl p-2 text-left transition hover:bg-surface/60">
      <Thumb p={point} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{point.title}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <Avatar className="h-4 w-4">
            <AvatarImage src={author?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[8px]">{(author?.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="truncate text-[11px] text-muted-foreground">por {author?.display_name ?? "alguien"}</span>
        </div>
      </div>
    </button>
  );
}

function NearRow({ point, onClick }: { point: any; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface/60">
      <Thumb p={point} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{point.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">A {point.distance.toFixed(point.distance < 1 ? 2 : 1)} km</p>
      </div>
      <span className="text-[11px] font-semibold text-primary">★ {Number(point.avg_rating).toFixed(1)}</span>
    </button>
  );
}

function Thumb({ p }: { p: any }) {
  if (p.image_url) {
    return <img src={p.image_url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" loading="lazy" />;
  }
  const slug = p.categories?.slug ?? p.category_slug ?? null;
  return (
    <div className="h-11 w-11 shrink-0 rounded-lg"
      style={{ background: `radial-gradient(circle at 40% 30%, ${categoryColor(slug)}66, oklch(0.16 0.03 260))` }} />
  );
}
