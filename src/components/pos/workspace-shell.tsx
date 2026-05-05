"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Archive,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Wrench,
} from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { LogoutButton } from "@/components/logout-button";
import type { SessionUserSummary } from "@/lib/pos/types";

type WorkspaceShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  session: SessionUserSummary;
  children: React.ReactNode;
};

export function WorkspaceShell({
  eyebrow,
  title,
  description,
  session,
  children,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const isAdmin = session.role === "super_admin";
  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      visible: isAdmin,
    },
    {
      href: "/pos",
      label: "POS",
      icon: CreditCard,
      visible: true,
    },
    {
      href: "/leasing",
      label: "Leasing",
      icon: Wrench,
      visible: isAdmin,
    },
    {
      href: "/inventory",
      label: "Inventory",
      icon: Boxes,
      visible: isAdmin,
    },
    {
      href: "/receipts",
      label: "Receipts",
      icon: Archive,
      visible: true,
    },
  ].filter((item) => item.visible);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-5 md:px-6 md:py-6">
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="panel overflow-hidden px-5 py-5"
        >
          <div className="space-y-6">
            <BrandLockup compact />

            <div className="rounded-[26px] border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-soft">
                Signed in
              </p>
              <p className="mt-3 text-lg font-semibold text-ink">{session.name}</p>
              <p className="mt-1 text-sm text-ink-soft">{session.email}</p>
              <span className="badge mt-4 bg-accent/10 text-accent">
                {session.role === "super_admin" ? "Super Admin" : "Cashier"}
              </span>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-gradient-to-r from-accent to-sea text-white shadow-[0_14px_30px_rgba(35,95,158,0.18)]"
                        : "bg-white/60 text-ink hover:bg-white/80"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="rounded-[26px] border border-accent/10 bg-accent/6 p-4 text-sm leading-7 text-ink-soft">
              Low stock alerts, overdue leases, PDF receipts, and CSV exports are all
              built directly into this workspace.
            </div>

            <LogoutButton />
          </div>
        </motion.aside>

        <section className="space-y-5">
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel relative overflow-hidden px-6 py-6 md:px-8"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(17,168,109,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(35,95,158,0.18),transparent_28%)]" />
            <div className="relative">
              <span className="eyebrow">{eyebrow}</span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-8 text-ink-soft md:text-base">
                {description}
              </p>
            </div>
          </motion.header>

          {children}
        </section>
      </div>
    </main>
  );
}
