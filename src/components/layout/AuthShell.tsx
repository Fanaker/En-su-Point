import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import heroImg from "@/assets/hero-night.jpg";
import { Link } from "@tanstack/react-router";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div
        className="absolute inset-0 opacity-25 mix-blend-luminosity"
        style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      {/* ambient glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-[120px] animate-float" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-burgundy/30 blur-[120px] animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 pt-6">
          <Link to="/"><Logo size="md" /></Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="glass rounded-3xl p-8 shadow-elegant sm:p-10">
              <div className="mb-7 text-center">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
                {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              {children}
            </div>
            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
