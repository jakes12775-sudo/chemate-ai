"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="button-secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
          });
          router.push("/auth");
          router.refresh();
        })
      }
    >
      <LogOut className="h-4 w-4" />
      {isPending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
