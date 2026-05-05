"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  FileDown,
  PackageSearch,
  ReceiptText,
  TimerReset,
} from "lucide-react";
import { RevenueChart } from "@/components/pos/revenue-chart";
import { formatCompactCurrency, formatCurrency, formatDateTime, formatLiters } from "@/lib/pos/format";
import type { DashboardSnapshot } from "@/lib/pos/types";

export function DashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const cards = [
    {
      label: "Total revenue",
      value: formatCurrency(snapshot.metrics.totalRevenueInCents),
      tone: "success",
    },
    {
      label: "Sales revenue",
      value: formatCurrency(snapshot.metrics.salesRevenueInCents),
    },
    {
      label: "Leasing revenue",
      value: formatCurrency(snapshot.metrics.leasingRevenueInCents),
    },
    {
      label: "Active leases",
      value: String(snapshot.metrics.activeLeases),
      tone: "warning",
    },
    {
      label: "Low stock lines",
      value: String(snapshot.metrics.lowStockProducts),
      tone: snapshot.metrics.lowStockProducts ? "warning" : "success",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        {cards.map((card, index) => (
          <motion.article
            key={card.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="panel px-5 py-5"
          >
            <p className="text-sm font-semibold text-ink-soft">{card.label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-ink">
              {card.value}
            </p>
            <div className="mt-4">
              <span
                className={`badge ${
                  card.tone === "warning"
                    ? "bg-warning/18 text-amber-700"
                    : card.tone === "success"
                      ? "bg-accent/12 text-accent"
                      : "bg-sea/10 text-sea"
                }`}
              >
                Live
              </span>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="panel px-5 py-5"
        >
          <RevenueChart points={snapshot.revenueTimeline} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="panel px-5 py-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-ink">Operational pulse</p>
              <p className="mt-1 text-sm text-ink-soft">
                Quick actions and risk visibility for today.
              </p>
            </div>
            <a className="button-secondary" href="/api/reports/export">
              <FileDown className="h-4 w-4" />
              Export CSV
            </a>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-[24px] border border-line/70 bg-white/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-rose-100 text-rose-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-ink">Overdue leases</p>
                  <p className="text-sm text-ink-soft">
                    {snapshot.metrics.overdueLeases} records need follow-up.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-line/70 bg-white/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700">
                  <PackageSearch className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-ink">Available machines</p>
                  <p className="text-sm text-ink-soft">
                    {snapshot.metrics.availableMachines} machines are ready for dispatch.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-line/70 bg-white/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-sky-100 text-sky-700">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-ink">Recent receipt value</p>
                  <p className="text-sm text-ink-soft">
                    {formatCompactCurrency(
                      snapshot.recentReceipts.reduce(
                        (sum, receipt) => sum + receipt.totalInCents,
                        0,
                      ),
                    )}{" "}
                    across the latest issued receipts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="panel px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-ink">Overdue lease alerts</p>
              <p className="mt-1 text-sm text-ink-soft">
                Customers and machines that need immediate follow-up.
              </p>
            </div>
            <Link className="button-secondary" href="/leasing">
              Open leasing board
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {snapshot.overdueLeasesList.length ? (
              snapshot.overdueLeasesList.map((lease) => (
                <div
                  key={lease.id}
                  className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{lease.machineName}</p>
                      <p className="text-sm text-ink-soft">
                        {lease.customerName} · {lease.phoneNumber}
                      </p>
                    </div>
                    <span className="badge bg-rose-100 text-rose-700">Overdue</span>
                  </div>
                  <p className="mt-3 text-sm text-ink-soft">
                    Expected back {formatDateTime(lease.expectedReturnDate)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-line/70 bg-white/70 px-4 py-6 text-sm text-ink-soft">
                No overdue leases right now.
              </div>
            )}
          </div>
        </section>

        <section className="panel px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-ink">Low stock alerts</p>
              <p className="mt-1 text-sm text-ink-soft">
                Detergent lines that need replenishment soon.
              </p>
            </div>
            <Link className="button-secondary" href="/inventory">
              Manage inventory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {snapshot.lowStockProducts.length ? (
              snapshot.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{product.name}</p>
                      <p className="text-sm text-ink-soft">{product.sku}</p>
                    </div>
                    <span className="badge bg-amber-100 text-amber-700">
                      {formatLiters(product.stockInMl)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-line/70 bg-white/70 px-4 py-6 text-sm text-ink-soft">
                Stock levels are healthy across all detergents.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="panel px-5 py-5">
          <div className="flex items-center gap-3">
            <TimerReset className="h-5 w-5 text-sea" />
            <div>
              <p className="text-lg font-semibold text-ink">Active lease board</p>
              <p className="text-sm text-ink-soft">
                Machines currently out with customers.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {snapshot.activeLeases.map((lease) => (
              <div
                key={lease.id}
                className="rounded-[22px] border border-line/70 bg-white/70 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{lease.machineName}</p>
                    <p className="text-sm text-ink-soft">
                      {lease.customerName} · {lease.machineCategory}
                    </p>
                  </div>
                  <span
                    className={`badge ${
                      lease.status === "overdue"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-accent/12 text-accent"
                    }`}
                  >
                    {lease.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink-soft">
                  Rate {formatCurrency(lease.rateInCents)} / {lease.rateUnit}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-ink">Recent receipts</p>
              <p className="text-sm text-ink-soft">
                Latest completed sales and lease checkouts.
              </p>
            </div>
            <Link className="button-secondary" href="/receipts">
              See all receipts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {snapshot.recentReceipts.map((receipt) => (
              <Link
                key={receipt.id}
                href={`/receipts/${receipt.receiptNumber}`}
                className="block rounded-[22px] border border-line/70 bg-white/70 px-4 py-4 transition hover:bg-white/90"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{receipt.receiptNumber}</p>
                    <p className="text-sm text-ink-soft">
                      {receipt.customerName} · {receipt.summary}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink">
                    {formatCurrency(receipt.totalInCents)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
