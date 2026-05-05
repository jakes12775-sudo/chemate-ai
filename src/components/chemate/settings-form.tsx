"use client";

import { useState, useTransition } from "react";
import { AiProvider } from "@prisma/client";
import { CheckCircle2, MoonStar, Sparkles, SunMedium } from "lucide-react";
import { toast } from "sonner";

type SettingsFormProps = {
  user: {
    name: string;
    email: string;
    username: string;
    school: string | null;
    preferredTheme: string;
    preferredAi: AiProvider;
  };
};

export function SettingsForm({ user }: SettingsFormProps) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [school, setSchool] = useState(user.school ?? "");
  const [preferredTheme, setPreferredTheme] = useState(user.preferredTheme || "system");
  const [preferredAi, setPreferredAi] = useState<AiProvider>(user.preferredAi || "mock");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          username,
          school,
          preferredTheme,
          preferredAi,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to save your settings.");
        return;
      }

      if (preferredTheme === "light" || preferredTheme === "dark") {
        document.documentElement.dataset.theme = preferredTheme;
        window.localStorage.setItem("chemate-theme", preferredTheme);
      } else {
        delete document.documentElement.dataset.theme;
        window.localStorage.removeItem("chemate-theme");
      }

      toast.success("Settings saved.");
    });
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6 md:p-8">
        <span className="eyebrow">Preferences</span>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Profile, theme, and AI</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-ink-soft">
          Keep your username searchable, switch theme, and choose your AI provider.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
          <input className="field" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
          <input className="field" value={user.email} disabled placeholder="Email" />
          <input className="field md:col-span-2" value={school} onChange={(event) => setSchool(event.target.value)} placeholder="University / campus" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <MoonStar className="h-5 w-5 text-cyan-300" />
              <p className="text-lg font-semibold text-ink">Theme mode</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { value: "dark", label: "Dark", icon: MoonStar },
                { value: "light", label: "Light", icon: SunMedium },
                { value: "system", label: "System", icon: CheckCircle2 },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${
                    preferredTheme === item.value
                      ? "border-cyan-300/30 bg-cyan-300/10 text-ink"
                      : "border-white/10 bg-white/5 text-ink-soft"
                  }`}
                  onClick={() => setPreferredTheme(item.value)}
                >
                  <item.icon className="mx-auto h-4 w-4" />
                  <span className="mt-2 block">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-lime-300" />
              <p className="text-lg font-semibold text-ink">External AI provider</p>
            </div>
            <select
              className="select mt-4"
              value={preferredAi}
              onChange={(event) => setPreferredAi(event.target.value as AiProvider)}
            >
              <option value="mock">Mock / local mode</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
            <p className="mt-3 text-sm leading-7 text-ink-soft">
              OpenAI and Gemini both work when the corresponding API key is present in the environment. External knowledge is still only used when you explicitly allow it in the assistant.
            </p>
          </div>
        </div>

        <button type="button" className="button-primary mt-6" disabled={isPending} onClick={save}>
          Save settings
        </button>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          {
            title: "Play Store readiness",
            body: "The app is PWA-ready and mobile-responsive. For Play Store publishing, wrap it with Capacitor or Trusted Web Activity after production deployment.",
          },
          {
            title: "Google auth status",
            body: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable live Google sign-in for real student accounts.",
          },
          {
            title: "AI provider keys",
            body: "Use OPENAI_API_KEY for ChatGPT/OpenAI, or GEMINI_API_KEY for Gemini via the OpenAI-compatible endpoint.",
          },
        ].map((item) => (
          <div key={item.title} className="panel p-5">
            <p className="text-lg font-semibold text-ink">{item.title}</p>
            <p className="mt-3 text-sm leading-7 text-ink-soft">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
