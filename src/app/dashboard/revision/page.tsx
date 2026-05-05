import { RevisionPanel } from "@/components/chemate/revision-panel";
import { requirePageSession } from "@/lib/auth/session";
import { getStudyAnalytics, listRecentArtifactsForUser, listUploadsForUser } from "@/lib/chemate/service";

export const dynamic = "force-dynamic";

export default async function RevisionPage() {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);
  const [analytics, uploads, summaries] = await Promise.all([
    getStudyAnalytics(session.user.id),
    listUploadsForUser(session.user.id),
    listRecentArtifactsForUser(session.user.id, "summary"),
  ]);

  return (
    <RevisionPanel
      uploads={uploads.map((upload) => ({
        id: upload.id,
        title: upload.title,
        topic: upload.topic,
      }))}
      summaries={summaries.map((summary) => ({
        id: summary.id,
        title: summary.title,
        body: summary.body,
        payload:
          (summary.payload as {
            flashcards?: {
              id: string;
              question: string;
              answer: string;
              formula: string | null;
            }[];
          } | null) ?? null,
        createdAt: summary.createdAt.toISOString(),
      }))}
      streak={analytics.streak}
      totalMinutes={analytics.totalMinutes}
    />
  );
}
