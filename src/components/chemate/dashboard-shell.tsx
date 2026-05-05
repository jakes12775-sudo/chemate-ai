"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BadgeHelp,
  BrainCircuit,
  FlaskConical,
  House,
  LibraryBig,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { ThemeToggle } from "@/components/chemate/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

type DashboardShellProps = {
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    role: string;
    preferredTheme?: string;
    preferredAi?: string;
  };
  children: React.ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/library", label: "Notes", icon: LibraryBig },
  { href: "/dashboard/assistant", label: "Ask", icon: Sparkles },
  { href: "/dashboard/labs", label: "Labs", icon: FlaskConical },
  { href: "/dashboard/revision", label: "Revise", icon: BrainCircuit },
  { href: "/dashboard/predictor", label: "Exams", icon: TrendingUp },
  { href: "/dashboard/groups", label: "Groups", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings2 },
];

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="chemate-orb chemate-orb-one" />
      <div className="chemate-orb chemate-orb-two" />
      <div className="chemate-orb chemate-orb-three" />

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 md:px-6 md:py-6 xl:px-8">
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          className="panel hidden w-[320px] shrink-0 flex-col justify-between p-5 xl:flex"
        >
          <div className="space-y-6">
            <BrandLockup compact />

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-soft">
                Signed in
              </p>
              <p className="mt-3 text-xl font-semibold text-ink">{user.name}</p>
              <p className="mt-1 text-sm text-ink-soft">@{user.username}</p>
              <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="badge bg-cyan-400/12 text-cyan-200">Student Workspace</span>
                <span className="badge bg-lime-400/12 text-lime-200">
                  {user.preferredAi ?? "mock"} AI
                </span>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm font-semibold transition duration-200 ${
                      active
                        ? "bg-[linear-gradient(120deg,rgba(82,251,210,0.22),rgba(25,107,255,0.25))] text-white shadow-[0_18px_45px_rgba(17,128,255,0.18)]"
                        : "bg-white/3 text-ink-soft hover:bg-white/8 hover:text-ink"
                    }`}
                  >
                    <item.icon
                      className={`h-4 w-4 transition ${active ? "text-lime-200" : "text-cyan-300 group-hover:text-lime-200"}`}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="rounded-[28px] border border-cyan-300/14 bg-cyan-300/7 p-4 text-sm leading-7 text-ink-soft">
              Notes, answers, labs, revision, exams, and group work all stay in one place.
            </div>
          </div>

          <div className="space-y-3">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </motion.aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel flex flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6"
          >
            <div className="flex items-center gap-3 xl:hidden">
              <BrandLockup compact />
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-ink-soft md:flex md:items-center md:gap-2">
                <BadgeHelp className="h-4 w-4 text-cyan-300" />
                Upload, ask, revise, predict.
              </div>
              <ThemeToggle />
            </div>
          </motion.header>

          <div className="grid gap-3 xl:hidden">
            <div className="panel grid gap-2 p-3 sm:grid-cols-2">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-semibold transition ${
                      active ? "bg-cyan-400/14 text-ink" : "bg-white/4 text-ink-soft"
                    }`}
                  >
                    <item.icon className="h-4 w-4 text-cyan-300" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <section className="min-w-0 flex-1">{children}</section>
        </div>
      </div>
    </main>
  );
}
