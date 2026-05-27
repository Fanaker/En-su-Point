import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Compass, Sparkles, Star, Users } from "lucide-react";
import heroImg from "@/assets/hero-night.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/inicio" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Hero background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div
        className="absolute inset-0 opacity-30 mix-blend-luminosity"
        style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" className="text-foreground/80 hover:text-foreground">Iniciar sesión</Button>
          </Link>
          <Link to="/registro">
            <Button className="bg-gradient-primary shadow-glow-primary">Crear cuenta</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Descubre los points secretos de Lima
          </div>
          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
            Los mejores spots de Lima,
            <br />
            <span className="text-gradient">en su point.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Descubre, recomienda y guarda restaurantes, rooftops, bares, karaokes y rincones ocultos.
            Una comunidad urbana hecha por limeños, para limeños.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/registro">
              <Button size="lg" className="bg-gradient-primary shadow-glow-primary text-base h-12 px-8">
                Empezar ahora
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="h-12 px-8 border-border bg-surface/40 backdrop-blur-md">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid gap-6 sm:grid-cols-3">
          {[
            { icon: MapPin, title: "Mapa interactivo", desc: "Explora Lima en un mapa nocturno cinematográfico." },
            { icon: Compass, title: "Spots curados", desc: "Lugares descubiertos por la comunidad, no por algoritmos vacíos." },
            { icon: Users, title: "Social urbano", desc: "Sigue amigos, guarda lugares y comparte tus favoritos." },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 shadow-card transition hover:shadow-glow-primary">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-primary">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
