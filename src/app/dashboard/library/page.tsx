import { UploadStudio } from "@/components/chemate/upload-studio";
import { requirePageSession } from "@/lib/auth/session";
import { listUploadsForUser } from "@/lib/chemate/service";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);
  const uploads = await listUploadsForUser(session.user.id);

  return (
    <UploadStudio
      initialUploads={uploads.map((upload) => ({
        id: upload.id,
        kind: upload.kind,
        title: upload.title,
        topic: upload.topic,
        summary: upload.summary,
        tags: upload.tags,
        createdAt: upload.createdAt.toISOString(),
        fileName: upload.fileName,
        pages: upload.pages.map((page) => ({
          id: page.id,
          pageNumber: page.pageNumber,
        })),
        formulas: upload.formulas,
      }))}
    />
  );
}
