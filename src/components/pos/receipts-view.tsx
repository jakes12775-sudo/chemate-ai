"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/pos/format";
import type { ReceiptSummary } from "@/lib/pos/types";

export function ReceiptsView({ receipts }: { receipts: ReceiptSummary[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "sale" | "lease">("all");
  const deferredSearch = useDeferredValue(search);
  const query = deferredSearch.trim().toLowerCase();

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesType = typeFilter === "all" || receipt.type === typeFilter;
    const matchesSearch =
      !query ||
      receipt.receiptNumber.toLowerCase().includes(query) ||
      receipt.customerName.toLowerCase().includes(query) ||
      receipt.summary.toLowerCase().includes(query);

    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-5">
      <section className="panel px-5 py-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-ink">Search receipts</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                className="field pl-11"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Receipt number, customer, or summary"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-ink">Type</span>
            <select
              className="field"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "all" | "sale" | "lease")
              }
            >
              <option value="all">All receipts</option>
              <option value="sale">Sales only</option>
              <option value="lease">Leases only</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {filteredReceipts.map((receipt) => (
          <Link
            key={receipt.id}
            href={`/receipts/${receipt.receiptNumber}`}
            className="panel block px-5 py-5 transition hover:bg-white/90"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-ink">{receipt.receiptNumber}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {receipt.customerName} · {receipt.summary}
                </p>
              </div>
              <span
                className={`badge ${
                  receipt.type === "sale"
                    ? "bg-sea/10 text-sea"
                    : "bg-accent/12 text-accent"
                }`}
              >
                {receipt.type}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 text-sm text-ink-soft">
              <span>{formatDateTime(receipt.createdAt)}</span>
              <span className="text-base font-semibold text-ink">
                {formatCurrency(receipt.totalInCents)}
              </span>
            </div>
          </Link>
        ))}
      </section>

      {!filteredReceipts.length ? (
        <section className="panel px-5 py-8 text-center text-sm text-ink-soft">
          No receipts matched your filter.
        </section>
      ) : null}
    </div>
  );
}
