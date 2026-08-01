import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Compass,
  Home,
  LogOut,
  Menu,
  PlaySquare,
  Search,
  Upload,
  UserRound,
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
  { to: "/dashboard", label: "Your videos", icon: PlaySquare },
  { to: "/upload", label: "Upload", icon: Upload },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { user } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link to="/" className="flex items-center gap-2 pr-2">
          <span className="flex h-6 w-8 items-center justify-center rounded bg-primary">
            <Play />
          </span>
          <span className="hidden text-lg font-bold tracking-tight sm:inline">StreamHub</span>
        </Link>

        <form
          className="mx-auto flex w-full max-w-xl items-center"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/explore", search: { q: query } });
          }}
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos"
            aria-label="Search videos"
            className="h-9 rounded-l-full rounded-r-none border-r-0 bg-surface"
          />
          <Button
            type="submit"
            variant="secondary"
            className="h-9 rounded-l-none rounded-r-full px-5"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/upload">
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(user.email ?? "U").slice(0, 2).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="text-xs">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Your videos</Link>
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
            <Button asChild size="sm" variant="outline">
              <Link to="/auth">
                <UserRound className="mr-2 h-4 w-4" /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            "sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 overflow-y-auto border-r border-border bg-sidebar py-3 md:block",
            open ? "w-56 px-3" : "w-[72px] px-2",
          )}
        >
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center rounded-lg text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                    open ? "gap-4 px-3 py-2.5" : "flex-col gap-1 px-1 py-3 text-[10px]",
                    active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function Play() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-primary-foreground" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
