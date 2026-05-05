"use client";

import { motion } from "framer-motion";
import { formatCompactCurrency } from "@/lib/pos/format";
import type { RevenuePoint } from "@/lib/pos/types";

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const maxValue = Math.max(...points.map((point) => point.totalInCents), 1);

  return (
    <div className="rounded-[28px] border border-line/70 bg-white/72 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">Revenue trend</p>
          <p className="mt-1 text-sm text-ink-soft">
            Daily view of detergent sales and lease income.
          </p>
        </div>
        <p className="text-sm font-semibold text-ink-soft">
          Peak {formatCompactCurrency(maxValue)}
        </p>
      </div>

      <div className="mt-6 grid h-64 grid-cols-7 items-end gap-3">
        {points.map((point, index) => {
          const totalHeight = `${Math.max((point.totalInCents / maxValue) * 100, 4)}%`;
          const leaseShare =
            point.totalInCents === 0
              ? 0
              : (point.leaseInCents / point.totalInCents) * 100;

          return (
            <div key={point.key} className="flex h-full flex-col items-center justify-end gap-3">
              <div className="flex h-full w-full items-end">
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: totalHeight, opacity: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.35 }}
                  className="relative w-full rounded-[18px] bg-gradient-to-t from-sea via-accent to-sage shadow-[0_12px_24px_rgba(35,95,158,0.16)]"
                >
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-b-[18px] bg-white/20"
                    style={{ height: `${leaseShare}%` }}
                  />
                </motion.div>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
                  {point.label}
                </p>
                <p className="mt-1 text-xs text-ink">{formatCompactCurrency(point.totalInCents)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
