import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, MessageCircle, Star, Heart, UserPlus } from "lucide-react";
import { usePointModal } from "@/components/points/PointModalContext";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/notificaciones")({ component: NotifPage });

const ICONS: Record<string, any> = { comment: MessageCircle, rating: Star, reaction: Heart, follow: UserPlus };

function NotifPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { open } = usePointModal();

  const { data: items = [] } = useQuery({
    enabled: !!user,
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("notifications")
        .select("*, actor:actor_id(display_name,avatar_url,username), point:point_id(title)")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").update({ is_read: true })
      .eq("user_id", user.id).eq("is_read", false)
      .then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
  }, [user, qc]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-3xl mx-auto">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-bold"><Bell className="h-6 w-6 text-primary" /> Notificaciones</h1>
      <div className="space-y-2">
        {items.length === 0 && <p className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Sin notificaciones aún.</p>}
        {(items as any[]).map((n) => {
          const Icon = ICONS[n.type] || Bell;
          return (
            <button key={n.id} onClick={() => n.point_id && open(n.point_id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-gradient-card p-3 text-left transition hover:bg-surface/60">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={n.actor?.avatar_url ?? undefined} />
                  <AvatarFallback>{(n.actor?.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Icon className="h-3 w-3" /></div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm"><span className="font-semibold">{n.actor?.display_name ?? "Alguien"}</span> {n.message}{n.point?.title ? ` · ${n.point.title}` : ""}</p>
                <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}