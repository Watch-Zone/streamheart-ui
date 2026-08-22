import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignIn, SignUp, useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — StreamHub" },
      {
        name: "description",
        content:
          "Sign in to StreamHub to upload videos, go live, and join private watch-together rooms with friends.",
      },
      { property: "og:title", content: "Sign in — StreamHub" },
      { property: "og:description", content: "Access your CineView creator studio, live streams and rooms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate({ to: "/", replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="aurora pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-70" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <BrandMark className="mb-6" />

        <h1 className="text-center font-display text-2xl font-extrabold tracking-tight">
          {mode === "sign-in" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Upload, go live and host private watch-together rooms.
        </p>

        <div className="mt-8 w-full">
          {mode === "sign-in" ? (
            <SignIn routing="virtual" signUpUrl="#" appearance={{ variables: { colorPrimary: "#6366f1" } }} />
          ) : (
            <SignUp routing="virtual" signInUrl="#" appearance={{ variables: { colorPrimary: "#6366f1" } }} />
          )}
        </div>

        <Button
          variant="ghost"
          className="mt-6 rounded-full text-sm text-muted-foreground"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "New here? Create an account" : "Already have an account? Sign in"}
        </Button>
      </div>
    </div>
  );
}
