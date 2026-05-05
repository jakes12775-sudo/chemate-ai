import Link from "next/link";
import { WifiOff, BookOpenText, BrainCircuit, FlaskConical } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 md:px-8">
      <section className="panel px-6 py-8 md:px-8">
        <span className="eyebrow">Offline fallback</span>
        <div className="mt-5 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-ink text-card">
              <WifiOff className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink">
                Chemate is offline right now.
              </h1>
              <p className="mt-2 text-base leading-7 text-ink-soft">
                When your connection returns, reopen the workspace to continue reading
                notes, revising, and generating answers.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Notes",
                icon: BookOpenText,
                body: "Cached note pages stay available so reading does not stop with the network.",
              },
              {
                title: "Revision",
                icon: BrainCircuit,
                body: "Saved summaries and flashcards are ready again as soon as sync returns.",
              },
              {
                title: "Labs",
                icon: FlaskConical,
                body: "Lab reports and practical work continue syncing when you are back online.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[24px] border border-line/80 bg-white/72 p-4"
              >
                <item.icon className="h-5 w-5 text-sea" />
                <p className="mt-4 text-lg font-semibold text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{item.body}</p>
              </article>
            ))}
          </div>

          <Link className="button-primary w-fit" href="/auth">
            Return to workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
