import { redirect } from "next/navigation";
import { getCurrentSession, getHomeRouteForRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getCurrentSession();
  redirect(session ? getHomeRouteForRole(session.user.role) : "/auth");
}
