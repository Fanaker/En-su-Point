import logoPin from "@/assets/logo-pin.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: "h-6 w-6", text: "text-base" },
  md: { icon: "h-9 w-9", text: "text-xl" },
  lg: { icon: "h-14 w-14", text: "text-3xl" },
  xl: { icon: "h-20 w-20", text: "text-4xl" },
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-xl bg-primary/40" aria-hidden />
        <img
          src={logoPin}
          alt="En su Point"
          className={cn(s.icon, "relative drop-shadow-[0_0_20px_rgba(37,99,235,0.5)]")}
          width={80}
          height={80}
        />
      </div>
      {showText && (
        <span className={cn(s.text, "font-bold tracking-tight text-foreground")}>
          En su <span className="text-gradient">Point</span>
        </span>
      )}
    </div>
  );
}
