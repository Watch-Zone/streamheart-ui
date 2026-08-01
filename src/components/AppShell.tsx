import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Compass,
  Home,
  LayoutDashboard,
  LogOut,
  Radio,
  Search,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/live", label: "Live", icon: Radio },
  { to: "/rooms", label: "Rooms", icon: Users },
  { to: "/dashboard", label: "Studio", icon: LayoutDashboard },
] as const;

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-primary-foreground">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight">StreamHub</span>
    </span>
  );
}


export function AppShell({
  children,
  bleed = false,
}: {
  children: ReactNode;
  bleed?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { user } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="relative min-h-screen bg-background">
      <div className="aurora pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-70" />

      <header
        className={cn(
          "sticky top-0 z-50 transition-colors duration-300",
          scrolled ? "glass border-b border-border/60" : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="StreamHub home">
            <BrandMark />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground",
                  isActive(item.to) && "bg-secondary text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form
            className="ml-auto flex w-full max-w-sm items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/explore", search: { q: query } });
            }}
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, creators…"
                aria-label="Search videos"
                maxLength={120}
                className="h-10 rounded-full border-border/70 bg-surface/70 pl-9 pr-4 text-sm backdrop-blur"
              />
            </div>
          </form>

          <Button
            asChild
            size="sm"
            className="hidden rounded-full font-semibold shadow-none transition-transform hover:scale-[1.03] sm:inline-flex"
          >
            <Link to="/upload">
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {(user.email ?? "U").slice(0, 2).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem disabled className="text-xs">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile/$userId" params={{ userId: user.id }}>
                    My profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Creator studio</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/live">Live now</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/rooms">My rooms</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/upload">Upload video</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" variant="outline" className="rounded-full border-border/70">
              <Link to="/auth">
                <UserRound className="mr-2 h-4 w-4" /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </header>

      <main
        className={cn(
          "relative z-10 min-h-[70vh] pb-32 lg:pb-16",
          bleed ? "" : "mx-auto max-w-[1600px] px-4 pt-6 sm:px-6",
        )}
      >
        {children}
      </main>

      {/* Compact floating dock — icons only, active item expands into a pill */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:hidden"
      >
        <div className="float-dock flex items-center gap-1 rounded-full p-1.5">
          {NAV.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-full px-3.5 text-[12px] font-semibold transition-all duration-300 ease-out",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground active:scale-95",
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap transition-all duration-300",
                    active ? "max-w-[72px] opacity-100" : "max-w-0 opacity-0",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>


      <footer className="relative z-10 hidden border-t border-border/60 py-8 text-center text-xs text-muted-foreground lg:block">
        StreamHub — stream, upload and watch together.
      </footer>
    </div>
  );
}
