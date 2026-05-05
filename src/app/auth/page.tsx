import {
  BookOpenText,
  BrainCircuit,
  FileQuestion,
  FlaskConical,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { LoginForm } from "@/components/login-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const features = [
  {
    title: "Grounded note answers",
    body: "Cites your uploads first. Asks before using external AI.",
    icon: BookOpenText,
  },
  {
    title: "Exam prediction",
    body: "Finds likely exam patterns from notes and question history.",
    icon: TrendingUp,
  },
  {
    title: "Lab report engine",
    body: "Builds detailed lab reports and exports them as PDF.",
    icon: FlaskConical,
  },
  {
    title: "Revision memory",
    body: "Turns notes into summaries and flashcards.",
    icon: BrainCircuit,
  },
  {
    title: "Question bank upload",
    body: "Batch upload notes, CATs, assignments, and lab manuals.",
    icon: FileQuestion,
  },
  {
    title: "AI provider ready",
    body: "Works with OpenAI or Gemini keys when you enable them.",
    icon: Sparkles,
  },
];

export default async function AuthPage() {
  await redirectIfAuthenticated();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] items-center px-4 py-8 md:px-8">
      <div className="grid w-full gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <section className="panel order-2 relative overflow-hidden px-6 py-8 md:px-10 md:py-10 xl:order-1">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(167,236,56,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(25,118,255,0.18),transparent_30%),radial-gradient(circle_at_60%_28%,rgba(57,214,255,0.14),transparent_20%)]" />

          <div className="relative space-y-8">
            <BrandLockup showMeta />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map((item, index) => (
                <article
                  key={item.title}
                  className="glass-hover rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_48px_rgba(4,18,40,0.22)]"
                  style={{
                    animationDelay: `${index * 90}ms`,
                  }}
                >
                  <item.icon className="h-5 w-5 text-cyan-300" />
                  <p className="mt-4 text-lg font-semibold text-ink">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-ink-soft">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel order-1 px-6 py-8 md:px-8 md:py-10 xl:order-2">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
