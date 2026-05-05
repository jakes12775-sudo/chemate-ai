import Link from "next/link";
import { ArrowLeft, ExternalLink, Mic, Video } from "lucide-react";
import { requirePageSession } from "@/lib/auth/session";
import { getGroupDetailForUser } from "@/lib/chemate/service";

type Params = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    room?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function GroupCallPage({ params, searchParams }: Params) {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);
  const { id } = await params;
  const { room } = await searchParams;
  const group = await getGroupDetailForUser(session.user.id, id);

  if (!group) {
    return (
      <div className="panel p-8">
        <p className="text-lg font-semibold text-ink">Group not found.</p>
      </div>
    );
  }

  const activeRoom =
    group.calls.find((call) => call.id === room) ?? group.calls[0] ?? null;

  if (!activeRoom) {
    return (
      <div className="space-y-6">
        <div className="panel p-8">
          <Link href="/dashboard/groups" className="button-secondary">
            <ArrowLeft className="h-4 w-4 text-cyan-300" />
            Back to groups
          </Link>
          <p className="mt-6 text-lg font-semibold text-ink">No active room yet.</p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            Start an audio or video room from the Groups page first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Call room</span>
            <h1 className="mt-3 text-3xl font-semibold text-ink">{group.name}</h1>
            <p className="mt-3 text-sm leading-8 text-ink-soft">
              {activeRoom.mode === "audio" ? "Audio" : "Video"} discussion room for fast group revision.
            </p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              Screen sharing works best from the full room view, especially for notes, slides, and worked calculations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/groups" className="button-secondary">
              <ArrowLeft className="h-4 w-4 text-cyan-300" />
              Back
            </Link>
            <a href={activeRoom.joinUrl} target="_blank" rel="noreferrer" className="button-primary">
              <ExternalLink className="h-4 w-4" />
              Open full room / screen share
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="panel p-6">
          <div className="flex items-center gap-3">
            {activeRoom.mode === "audio" ? (
              <Mic className="h-5 w-5 text-cyan-300" />
            ) : (
              <Video className="h-5 w-5 text-cyan-300" />
            )}
            <h2 className="text-2xl font-semibold text-ink">{activeRoom.title}</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-ink-soft">
            Room code: <span className="mono text-cyan-100">{activeRoom.roomName}</span>
          </p>
          <div className="mt-4 rounded-[22px] border border-cyan-300/14 bg-cyan-300/6 p-4 text-sm leading-7 text-ink-soft">
            Use the full room when you want to share slides, notes, PDF manuals, or live calculations with the group.
          </div>
          <div className="mt-6 space-y-3">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="font-semibold text-ink">@{member.user.username}</p>
                <p className="text-sm text-ink-soft">{member.user.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel overflow-hidden p-2">
          <iframe
            title={activeRoom.title}
            src={activeRoom.joinUrl}
            allow="camera; microphone; fullscreen; display-capture; clipboard-read; clipboard-write"
            className="h-[70vh] w-full rounded-[28px] border-0 bg-black"
          />
        </div>
      </section>
    </div>
  );
}
