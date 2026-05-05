"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AtSign,
  ArrowRight,
  GraduationCap,
  KeyRound,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";

type AuthMode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [school, setSchool] = useState("");
  const [email, setEmail] = useState("student@chemate.ai");
  const [password, setPassword] = useState("Chemate#2026");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, startTransition] = useTransition();

  const googleError = useMemo(() => {
    const value = searchParams.get("error");

    if (!value) {
      return "";
    }

    if (value === "google_not_configured") {
      return "Google sign-in is ready in the app, but GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET still need to be added to the environment.";
    }

    if (value === "github_not_configured") {
      return "GitHub sign-in is ready in the app, but GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET still need to be added to the environment.";
    }

    if (value === "microsoft_not_configured") {
      return "Microsoft sign-in is ready in the app, but MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET still need to be added to the environment.";
    }

    if (value === "github_email_missing") {
      return "GitHub did not return a verified email address. Make sure your account has a primary verified email.";
    }

    return "The selected sign-in provider could not complete authentication. Please try again or use email sign-in.";
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      try {
        const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            mode === "login"
              ? {
                  email,
                  password,
                }
              : {
                  name,
                  username: username.trim() || undefined,
                  school: school.trim() || undefined,
                  email,
                  password,
                },
          ),
        });

        const payload = (await response.json()) as
          | { error?: string }
          | { redirectTo: string };

        if (!response.ok || !("redirectTo" in payload)) {
          setErrorMessage(
            "error" in payload
              ? payload.error ?? "Unable to continue right now."
              : "Unable to continue right now.",
          );
          return;
        }

        router.push(payload.redirectTo);
        router.refresh();
      } catch {
        setErrorMessage("Something went wrong while contacting the server.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <span className="eyebrow">Authentication</span>
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          Sign in and study faster.
        </h2>
        <p className="text-sm leading-7 text-ink-soft">
          Notes first. External AI only with permission.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className={`rounded-[22px] border px-4 py-4 text-left transition ${
            mode === "login"
              ? "border-cyan-300/30 bg-cyan-300/10"
              : "border-white/8 bg-white/4"
          }`}
          onClick={() => setMode("login")}
        >
          <p className="text-sm font-semibold text-ink">Welcome back</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">Open your dashboard.</p>
        </button>
        <button
          type="button"
          className={`rounded-[22px] border px-4 py-4 text-left transition ${
            mode === "register"
              ? "border-lime-300/30 bg-lime-300/8"
              : "border-white/8 bg-white/4"
          }`}
          onClick={() => setMode("register")}
        >
          <p className="text-sm font-semibold text-ink">Create account</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">Set up Chemate in minutes.</p>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Google", href: "/api/auth/google/start" },
          { label: "GitHub", href: "/api/auth/github/start" },
          { label: "Microsoft", href: "/api/auth/microsoft/start" },
        ].map((providerItem) => (
          <button
            key={providerItem.label}
            type="button"
            className="button-secondary w-full justify-center"
            onClick={() => {
              window.location.href = providerItem.href;
            }}
          >
            <Sparkles className="h-4 w-4 text-cyan-300" />
            {providerItem.label}
          </button>
        ))}
      </div>

      {googleError ? (
        <div className="rounded-[20px] border border-yellow-300/20 bg-yellow-300/8 px-4 py-3 text-sm text-yellow-100">
          {googleError}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">Full name</span>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  className="field pl-11"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Amina Wanjiru"
                  required={mode === "register"}
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">Username</span>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  className="field pl-11"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="amina-wanjiru"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">University / campus</span>
              <div className="relative">
                <GraduationCap className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  className="field pl-11"
                  type="text"
                  value={school}
                  onChange={(event) => setSchool(event.target.value)}
                  placeholder="University of Nairobi"
                />
              </div>
            </label>
          </>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">Email address</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              className="field pl-11"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@chemate.ai"
              autoComplete="email"
              required
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">Password</span>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              className="field pl-11"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter a secure password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>
        </label>

        {errorMessage ? (
          <div className="rounded-[20px] border border-rose-300/20 bg-rose-300/8 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <button className="button-primary w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Sign In"
              : "Create Account"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-ink-soft">
        Demo student:
        <div className="mt-2 font-mono text-xs text-cyan-100">
          student@chemate.ai / Chemate#2026
        </div>
      </div>
    </div>
  );
}
