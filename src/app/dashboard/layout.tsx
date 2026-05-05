import { DashboardShell } from "@/components/chemate/dashboard-shell";
import { requirePageSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
