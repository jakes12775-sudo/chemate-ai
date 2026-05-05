import { PredictorPanel } from "@/components/chemate/predictor-panel";
import { requirePageSession } from "@/lib/auth/session";
import { listRecentArtifactsForUser, listUploadsForUser } from "@/lib/chemate/service";

export const dynamic = "force-dynamic";

export default async function PredictorPage() {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);
  const [uploads, predictions, answers] = await Promise.all([
    listUploadsForUser(session.user.id),
    listRecentArtifactsForUser(session.user.id, "exam_prediction"),
    listRecentArtifactsForUser(session.user.id, "answer"),
  ]);

  const latestPrediction = predictions[0] ?? null;

  return (
    <PredictorPanel
      initialPrediction={
        latestPrediction
          ? {
              id: latestPrediction.id,
              title: latestPrediction.title,
              body: latestPrediction.body,
              payload:
                (latestPrediction.payload as {
                  readinessScore?: number;
                  rankedTopics?: { topic: string; confidence: number; reason: string }[];
                  likelyQuestions?: { id: string; question: string; confidence: number }[];
                } | null) ?? null,
              createdAt: latestPrediction.createdAt.toISOString(),
            }
          : null
      }
      uploadCount={uploads.length}
      questionCount={answers.length}
    />
  );
}
