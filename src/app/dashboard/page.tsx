import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { requirePageSession } from "@/lib/auth/session";
import { getStudyAnalytics } from "@/lib/chemate/service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);
  const analytics = await getStudyAnalytics(session.user.id);
  const predictionPayload = analytics.lastPrediction?.payload as
    | {
        readinessScore?: number;
        rankedTopics?: { topic: string; confidence: number }[];
      }
    | null;

  const quickCards = [
    {
      title: "Notes",
      value: analytics.totalUploads,
      helper: "All uploads",
      icon: BookOpenText,
      href: "/dashboard/library",
    },
    {
      title: "Streak",
      value: `${analytics.streak} day${analytics.streak === 1 ? "" : "s"}`,
      helper: "Current run",
      icon: BrainCircuit,
      href: "/dashboard/revision",
    },
    {
      title: "Exam score",
      value: `${predictionPayload?.readinessScore ?? 0}%`,
      helper: "Prediction pulse",
      icon: TrendingUp,
      href: "/dashboard/predictor",
    },
    {
      title: "Groups",
      value: analytics.groupCount,
      helper: "Study teams",
      icon: Users,
      href: "/dashboard/groups",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden px-6 py-8 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(167,236,56,0.12),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(57,214,255,0.14),transparent_26%)]" />
        <div className="relative">
          <span className="eyebrow">Overview</span>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-ink md:text-5xl">
            Chemate keeps your chemistry study flow in one fast workspace.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-ink-soft md:text-base">
            Upload, ask, revise, predict, and collaborate without leaving your dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/library" className="button-primary">
              Open notes
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard/assistant" className="button-secondary">
              Ask
              <Sparkles className="h-4 w-4 text-cyan-300" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickCards.map((card) => (
          <Link key={card.title} href={card.href} className="panel glass-hover p-5">
            <card.icon className="h-5 w-5 text-cyan-300" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-ink-soft">
              {card.title}
            </p>
            <p className="mt-3 text-3xl font-semibold text-ink">{card.value}</p>
            <p className="mt-3 text-sm leading-7 text-ink-soft">{card.helper}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="eyebrow">Recent activity</span>
              <h2 className="mt-3 text-2xl font-semibold text-ink">Momentum</h2>
            </div>
            <p className="text-sm text-ink-soft">{analytics.totalMinutes} tracked minutes</p>
          </div>
          <div className="mt-6 space-y-4">
            {analytics.activityFeed.slice(0, 6).map((activity) => (
              <div
                key={activity.id}
                className="rounded-[24px] border border-white/8 bg-white/4 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-ink">{activity.label}</p>
                  <span className="badge bg-cyan-400/10 text-cyan-200">
                    {activity.minutes} min
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink-soft">
                  {activity.kind.replace("_", " ")} · {new Date(activity.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <span className="eyebrow">Exam pulse</span>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Likely topics</h2>
            <p className="mt-3 text-sm leading-7 text-ink-soft">
              More notes and more questions make this sharper.
            </p>
            <div className="mt-5 space-y-3">
              {(((predictionPayload?.rankedTopics ?? []) as { topic: string; confidence: number }[])
                .slice(0, 3)
                .map((item) => (
                  <div
                    key={item.topic}
                    className="rounded-[22px] border border-lime-300/12 bg-lime-300/6 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-ink">{item.topic}</p>
                      <span className="text-sm text-lime-200">
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )))}
            </div>
          </div>

          <div className="panel p-6">
            <span className="eyebrow">Shortcuts</span>
            <div className="mt-4 grid gap-3">
              {[
                { href: "/dashboard/library", label: "Upload notes" },
                { href: "/dashboard/assistant", label: "Ask questions" },
                { href: "/dashboard/labs", label: "Build lab reports" },
                { href: "/dashboard/groups", label: "Open study groups" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[22px] border border-white/8 bg-white/4 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/8"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
