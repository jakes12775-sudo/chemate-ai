import { SettingsForm } from "@/components/chemate/settings-form";
import { requirePageSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: session.user.id,
    },
    select: {
      name: true,
      email: true,
      username: true,
      school: true,
      preferredTheme: true,
      preferredAi: true,
    },
  });

  return <SettingsForm user={user} />;
}
