import { AssistantStudio } from "@/components/chemate/assistant-studio";
import { requirePageSession } from "@/lib/auth/session";
import { listRecentArtifactsForUser } from "@/lib/chemate/service";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);
  const recentAnswers = await listRecentArtifactsForUser(session.user.id, "answer");

  return (
    <AssistantStudio
      recentAnswers={recentAnswers.map((answer) => ({
        id: answer.id,
        prompt: answer.prompt ?? answer.title,
        title: answer.title,
        body: answer.body,
        createdAt: answer.createdAt.toISOString(),
        knowledgeMode: answer.knowledgeMode,
        answerBlocks:
          typeof answer.payload === "object" &&
          answer.payload &&
          "blocks" in answer.payload &&
          Array.isArray(answer.payload.blocks)
            ? answer.payload.blocks
                .filter(
                  (block): block is { label: string; content: string } =>
                    typeof block === "object" &&
                    block !== null &&
                    "label" in block &&
                    "content" in block &&
                    typeof block.label === "string" &&
                    typeof block.content === "string",
                )
            : [],
        citations: answer.citations.map((citation) => ({
          id: citation.id,
          pageNumber: citation.pageNumber,
          sectionTitle: citation.sectionTitle,
          snippet: citation.snippet,
        })),
      }))}
    />
  );
}
