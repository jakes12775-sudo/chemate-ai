import { LabStudio } from "@/components/chemate/lab-studio";
import { requirePageSession } from "@/lib/auth/session";
import { listUploadsForUser } from "@/lib/chemate/service";

export const dynamic = "force-dynamic";

export default async function LabsPage() {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);
  const manuals = await listUploadsForUser(session.user.id, "lab_manual");

  return (
    <LabStudio
      manuals={manuals.map((manual) => ({
        id: manual.id,
        title: manual.title,
        topic: manual.topic,
        summary: manual.summary,
      }))}
    />
  );
}
