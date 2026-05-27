import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import {
  Home, Compass, Map, PlusCircle, User as UserIcon, LogOut, Shield,
  Bell, Bookmark, Star, Users, Search, ChevronLeft, ChevronRight, Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const mainNav = [
  { to: "/inicio",           label: "Inicio",         icon: Home },
  { to: "/explorar",         label: "Explorar",       icon: Compass },
  { to: "/mapa",             label: "Mapa",           icon: Map },
  { to: "/buscar",           label: "Buscar",         icon: Search },
  { to: "/amigos",           label: "Amigos",         icon: Users },
  { to: "/notificaciones",   label: "Notificaciones", icon: Bell, badgeKey: "notif" },
  { to: "/guardados",        label: "Mis Guardados",  icon: Bookmark },
  { to: "/mis-puntuaciones", label: "Mis Reseñas",    icon: Star },
];

function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    const load = async () => {
      const { count: c } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (!cancel) setCount(c ?? 0);
    };
    load();
    const ch = supabase
      .channel("notif-badge")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => { cancel = true; supabase.removeChannel(ch); };
  }, [user]);
  return count;
}

function SidebarBody({ collapsed, onToggle, onNavigate }: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const { signOut, isAdmin, user } = useAuth();
  const loc = useLocation();
  const unread = useUnreadCount();
  const initials = (user?.user_metadata?.display_name as string)?.slice(0, 2).toUpperCase()
    || user?.email?.slice(0, 2).toUpperCase() || "EP";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2 px-3 pt-5 pb-4", collapsed && "justify-center px-0")}>
        <Link to="/inicio" onClick={onNavigate} className="flex items-center gap-2">
          <Logo size="sm" showText={!collapsed} />
        </Link>
        {onToggle && (
          <Button variant="ghost" size="icon"
            onClick={onToggle}
            className={cn("ml-auto h-7 w-7 hidden md:inline-flex", collapsed && "ml-0")}
            aria-label={collapsed ? "Expandir" : "Contraer"}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <Link to="/crear" onClick={onNavigate}
        className={cn(
          "mx-3 mb-4 inline-flex items-center justify-center gap-2 rounded-xl bg-burgundy px-3 py-2.5 text-sm font-semibold text-burgundy-foreground shadow-glow-burgundy hover:opacity-90 transition",
          collapsed && "mx-2 px-0",
        )}>
        <PlusCircle className="h-4 w-4" />
        {!collapsed && <span>Agregar Point</span>}
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {mainNav.map((n) => {
          const active = loc.pathname.startsWith(n.to);
          const showBadge = n.badgeKey === "notif" && unread > 0;
          return (
            <Link key={n.to} to={n.to} onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_oklch(0.55_0.21_264_/_0.4)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface/70",
                collapsed && "justify-center px-0",
              )}>
              <n.icon className={cn("h-5 w-5 shrink-0", active && "text-primary drop-shadow-[0_0_8px_oklch(0.7_0.2_260)]")} />
              {!collapsed && <span className="truncate">{n.label}</span>}
              {showBadge && (
                <span className={cn(
                  "absolute h-2 w-2 rounded-full bg-burgundy-glow shadow-[0_0_8px_oklch(0.6_0.2_10)]",
                  collapsed ? "top-2 right-2" : "right-3 top-3",
                )} />
              )}
            </Link>
          );
        })}
        {isAdmin && (
          <Link to="/admin" onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-burgundy-glow hover:bg-surface/70",
              collapsed && "justify-center px-0",
            )}>
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
      </nav>

      {/* Profile + logout pinned bottom */}
      <div className={cn("border-t border-border/60 p-3 space-y-1", collapsed && "px-2")}>
        <Link to="/perfil" onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface/70",
            collapsed && "justify-center",
            loc.pathname.startsWith("/perfil") && "bg-surface/80",
          )}>
          <Avatar className="h-9 w-9 ring-1 ring-primary/40">
            {avatar ? <AvatarImage src={avatar} /> : null}
            <AvatarFallback className="bg-primary/20 text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {(user?.user_metadata?.display_name as string) || user?.email?.split("@")[0]}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">Mi perfil</div>
            </div>
          )}
        </Link>
        <button onClick={signOut}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface/70 transition",
            collapsed && "justify-center px-0",
          )}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Salir</span>}
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("esp:nav-collapsed") === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    localStorage.setItem("esp:nav-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const sidebarWidth = collapsed ? 76 : 212;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop fixed sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden border-r border-border/60 bg-background/85 backdrop-blur-xl md:block transition-[width] duration-300"
        style={{ width: sidebarWidth }}>
        <SidebarBody collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>

      {/* Mobile header + sheet */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-border/60 bg-background/95 p-0 backdrop-blur-xl">
            <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link to="/inicio"><Logo size="sm" /></Link>
        <Link to="/notificaciones"><Bell className="h-5 w-5" /></Link>
      </header>

      <main
        className="min-h-screen pb-10 transition-[padding] duration-300"
        style={{ ["--sb-w" as never]: `${sidebarWidth}px` }}>
        <div className="md:pl-[var(--sb-w)] transition-[padding-left] duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
