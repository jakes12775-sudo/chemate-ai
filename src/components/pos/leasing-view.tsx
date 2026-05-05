"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/pos/format";
import type { LeasingSnapshot } from "@/lib/pos/types";

export function LeasingView({ snapshot }: { snapshot: LeasingSnapshot }) {
  const router = useRouter();
  const [newMachine, setNewMachine] = useState({
    name: "",
    category: "",
    description: "",
    defaultRate: "",
    rateUnit: "day",
  });
  const [pending, startUiTransition] = useTransition();

  async function handleCreateMachine() {
    startUiTransition(async () => {
      const response = await fetch("/api/pos/machines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newMachine),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "Could not add the machine.");
        return;
      }

      toast.success("Machine added to the leasing catalog.");
      setNewMachine({
        name: "",
        category: "",
        description: "",
        defaultRate: "",
        rateUnit: "day",
      });
      router.refresh();
    });
  }

  async function handleLeaseReturn(leaseId: string) {
    startUiTransition(async () => {
      const response = await fetch(`/api/pos/leases/${leaseId}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actualReturnDate: new Date().toISOString(),
        }),
      });
      const payload = (await response.json()) as
        | { error?: string }
        | { receiptNumber?: string };

      if (!response.ok) {
        toast.error(
          "error" in payload ? payload.error ?? "Could not return the machine." : "Could not return the machine.",
        );
        return;
      }

      toast.success("Machine returned successfully.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
      <section className="space-y-5">
        <article className="panel px-5 py-5">
          <div className="flex items-center gap-3">
            <PlusCircle className="h-5 w-5 text-accent" />
            <div>
              <p className="text-lg font-semibold text-ink">Add machine</p>
              <p className="text-sm text-ink-soft">
                Expand the leasing catalog without touching the database manually.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <input
              className="field"
              placeholder="Machine name"
              value={newMachine.name}
              onChange={(event) =>
                setNewMachine((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              className="field"
              placeholder="Category"
              value={newMachine.category}
              onChange={(event) =>
                setNewMachine((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            />
            <input
              className="field lg:col-span-2"
              placeholder="Description"
              value={newMachine.description}
              onChange={(event) =>
                setNewMachine((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <input
              className="field"
              type="number"
              min="0"
              step="0.01"
              placeholder="Default rate"
              value={newMachine.defaultRate}
              onChange={(event) =>
                setNewMachine((current) => ({
                  ...current,
                  defaultRate: event.target.value,
                }))
              }
            />
            <select
              className="field"
              value={newMachine.rateUnit}
              onChange={(event) =>
                setNewMachine((current) => ({
                  ...current,
                  rateUnit: event.target.value,
                }))
              }
            >
              <option value="day">Per day</option>
              <option value="hour">Per hour</option>
            </select>
          </div>

          <button
            type="button"
            className="button-primary mt-5"
            onClick={handleCreateMachine}
            disabled={pending}
          >
            {pending ? "Saving..." : "Add machine"}
          </button>
        </article>

        <article className="panel px-5 py-5">
          <p className="text-lg font-semibold text-ink">Machine catalog</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {snapshot.machines.map((machine) => (
              <div
                key={machine.id}
                className="rounded-[22px] border border-line/70 bg-white/72 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{machine.name}</p>
                    <p className="text-sm text-ink-soft">{machine.category}</p>
                  </div>
                  <span
                    className={`badge ${
                      machine.isAvailable
                        ? "bg-accent/12 text-accent"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {machine.isAvailable ? "Available" : "Out"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink-soft">{machine.description}</p>
                <p className="mt-3 text-sm font-semibold text-ink">
                  {formatCurrency(machine.defaultRateInCents)} / {machine.rateUnit}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <aside className="space-y-5">
        <article className="panel px-5 py-5">
          <div className="flex items-center gap-3">
            <TimerReset className="h-5 w-5 text-sea" />
            <div>
              <p className="text-lg font-semibold text-ink">Active leases</p>
              <p className="text-sm text-ink-soft">
                Return jobs from the admin side whenever needed.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {snapshot.activeLeases.map((lease) => (
              <div
                key={lease.id}
                className="rounded-[22px] border border-line/70 bg-white/72 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{lease.machineName}</p>
                    <p className="text-sm text-ink-soft">
                      {lease.customerName} · {lease.phoneNumber}
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
                  Due {formatDateTime(lease.expectedReturnDate)}
                </p>
                <button
                  type="button"
                  className="button-secondary mt-4 w-full"
                  onClick={() => void handleLeaseReturn(lease.id)}
                  disabled={pending}
                >
                  Return machine
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel px-5 py-5">
          <p className="text-lg font-semibold text-ink">Lease history</p>
          <div className="mt-5 space-y-3">
            {snapshot.leaseHistory.map((lease) => (
              <div
                key={lease.id}
                className="rounded-[22px] border border-line/70 bg-white/72 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{lease.leaseNumber}</p>
                    <p className="text-sm text-ink-soft">
                      {lease.machineName} · {lease.customerName}
                    </p>
                  </div>
                  <span className="badge bg-sea/10 text-sea">
                    {lease.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink-soft">
                  {formatCurrency(lease.rateInCents)} / {lease.rateUnit}
                </p>
              </div>
            ))}
          </div>
        </article>
      </aside>
    </div>
  );
}
