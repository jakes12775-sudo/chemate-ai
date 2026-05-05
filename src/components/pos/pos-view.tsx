"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingCart, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime, formatLiters } from "@/lib/pos/format";
import type { MachineSnapshot, PosSnapshot, ProductSnapshot } from "@/lib/pos/types";

type CartItem = {
  productId: string;
  name: string;
  pricePerLiterInCents: number;
  quantityLiters: number;
  lineTotalInCents: number;
};

function toDateTimeLocalValue(date: Date) {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function calculateLineTotal(product: ProductSnapshot, quantityLiters: number) {
  return Math.round(product.pricePerLiterInCents * quantityLiters);
}

function nextLeaseDefaults(machine?: MachineSnapshot) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    machineId: machine?.id ?? "",
    customerFullName: "",
    customerPhone: "",
    customerIdNumber: "",
    notes: "",
    dateOut: toDateTimeLocalValue(now),
    expectedReturnDate: toDateTimeLocalValue(tomorrow),
    rate: machine ? String(machine.defaultRateInCents / 100) : "",
    rateUnit: machine?.rateUnit ?? "day",
  };
}

export function PosView({ snapshot }: { snapshot: PosSnapshot }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"sales" | "leasing">("sales");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleQuantities, setSaleQuantities] = useState<Record<string, string>>({});
  const [saleCustomerName, setSaleCustomerName] = useState("");
  const [saleCustomerPhone, setSaleCustomerPhone] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [leaseForm, setLeaseForm] = useState(() =>
    nextLeaseDefaults(snapshot.machines.find((machine) => machine.isAvailable)),
  );
  const [pending, startUiTransition] = useTransition();

  const availableMachines = snapshot.machines.filter((machine) => machine.isAvailable);
  const cartTotalInCents = cart.reduce((sum, item) => sum + item.lineTotalInCents, 0);

  function addToCart(product: ProductSnapshot) {
    const quantityLiters = Number(saleQuantities[product.id] ?? "0.5");

    if (!Number.isFinite(quantityLiters) || quantityLiters < 0.5) {
      toast.error("Use quantities from 0.5 liters and above.");
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.productId === product.id);

      if (existing) {
        return currentCart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantityLiters: item.quantityLiters + quantityLiters,
                lineTotalInCents: calculateLineTotal(
                  product,
                  item.quantityLiters + quantityLiters,
                ),
              }
            : item,
        );
      }

      return [
        ...currentCart,
        {
          productId: product.id,
          name: product.name,
          pricePerLiterInCents: product.pricePerLiterInCents,
          quantityLiters,
          lineTotalInCents: calculateLineTotal(product, quantityLiters),
        },
      ];
    });
    setSaleQuantities((current) => ({
      ...current,
      [product.id]: "0.5",
    }));
  }

  function removeCartItem(productId: string) {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));
  }

  function resetSaleForm() {
    setCart([]);
    setSaleCustomerName("");
    setSaleCustomerPhone("");
    setSaleNotes("");
  }

  function openReceipt(receiptNumber: string) {
    window.open(`/receipts/${receiptNumber}`, "_blank", "noopener,noreferrer");
  }

  async function handleCheckout() {
    if (!cart.length) {
      toast.error("Add at least one detergent item to the cart.");
      return;
    }

    startUiTransition(async () => {
      const response = await fetch("/api/pos/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: saleCustomerName,
          customerPhone: saleCustomerPhone,
          notes: saleNotes,
          items: cart.map((item) => ({
            productId: item.productId,
            quantityLiters: item.quantityLiters,
          })),
        }),
      });

      const payload = (await response.json()) as
        | { error?: string }
        | { receiptNumber: string };

      if (!response.ok || !("receiptNumber" in payload)) {
        toast.error(
          "error" in payload ? payload.error ?? "Could not complete the sale." : "Could not complete the sale.",
        );
        return;
      }

      toast.success(`Sale completed. Receipt ${payload.receiptNumber} is ready.`);
      resetSaleForm();
      openReceipt(payload.receiptNumber);
      router.refresh();
    });
  }

  async function handleLeaseSubmit() {
    startUiTransition(async () => {
      const response = await fetch("/api/pos/leases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(leaseForm),
      });

      const payload = (await response.json()) as
        | { error?: string }
        | { leaseNumber: string };

      if (!response.ok || !("leaseNumber" in payload)) {
        toast.error(
          "error" in payload ? payload.error ?? "Could not register the lease." : "Could not register the lease.",
        );
        return;
      }

      toast.success(`Lease ${payload.leaseNumber} registered successfully.`);
      const machine = availableMachines.find(
        (candidate) => candidate.id === leaseForm.machineId,
      );
      setLeaseForm(nextLeaseDefaults(machine));
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
          "error" in payload ? payload.error ?? "Could not close the lease." : "Could not close the lease.",
        );
        return;
      }

      if ("receiptNumber" in payload && payload.receiptNumber) {
        toast.success(`Lease returned. Receipt ${payload.receiptNumber} generated.`);
        openReceipt(payload.receiptNumber);
      } else {
        toast.success("Lease returned successfully.");
      }

      router.refresh();
    });
  }

  function updateLeaseMachine(machineId: string) {
    const selectedMachine = snapshot.machines.find((machine) => machine.id === machineId);

    setLeaseForm((current) => ({
      ...current,
      machineId,
      rate: selectedMachine
        ? String(selectedMachine.defaultRateInCents / 100)
        : current.rate,
      rateUnit: selectedMachine?.rateUnit ?? current.rateUnit,
    }));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
      <section className="panel px-5 py-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
              activeTab === "sales"
                ? "bg-gradient-to-r from-sea to-accent text-white"
                : "bg-white/70 text-ink"
            }`}
            onClick={() => setActiveTab("sales")}
          >
            <ShoppingCart className="mr-2 inline h-4 w-4" />
            Detergent sales
          </button>
          <button
            type="button"
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
              activeTab === "leasing"
                ? "bg-gradient-to-r from-accent to-sage text-white"
                : "bg-white/70 text-ink"
            }`}
            onClick={() => setActiveTab("leasing")}
          >
            <Truck className="mr-2 inline h-4 w-4" />
            Machine leasing
          </button>
        </div>

        {activeTab === "sales" ? (
          <motion.div
            key="sales"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-6"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {snapshot.products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-[26px] border border-line/70 bg-white/72 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">{product.name}</p>
                      <p className="mt-1 text-sm text-ink-soft">{product.description}</p>
                    </div>
                    <span
                      className={`badge ${
                        product.isLowStock
                          ? "bg-amber-100 text-amber-700"
                          : "bg-accent/12 text-accent"
                      }`}
                    >
                      {formatLiters(product.stockInMl)}
                    </span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm text-ink-soft">Price per liter</p>
                      <p className="mt-1 text-xl font-semibold text-ink">
                        {formatCurrency(product.pricePerLiterInCents)}
                      </p>
                    </div>

                    <div className="flex items-end gap-3">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
                          Liters
                        </span>
                        <input
                          className="field w-28"
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={saleQuantities[product.id] ?? "0.5"}
                          onChange={(event) =>
                            setSaleQuantities((current) => ({
                              ...current,
                              [product.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="button-primary"
                        onClick={() => addToCart(product)}
                        disabled={pending}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <article className="rounded-[28px] border border-line/70 bg-white/72 p-5">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-sea" />
                <div>
                  <p className="text-lg font-semibold text-ink">Checkout cart</p>
                  <p className="text-sm text-ink-soft">
                    Customers pay immediately and receive a receipt instantly.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
                <div className="space-y-3">
                  {cart.length ? (
                    cart.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between gap-3 rounded-[20px] border border-line/70 bg-white px-4 py-4"
                      >
                        <div>
                          <p className="font-semibold text-ink">{item.name}</p>
                          <p className="text-sm text-ink-soft">
                            {item.quantityLiters} L · {formatCurrency(item.pricePerLiterInCents)} / L
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-ink">
                            {formatCurrency(item.lineTotalInCents)}
                          </p>
                          <button
                            type="button"
                            className="mt-2 text-sm font-semibold text-rose-600"
                            onClick={() => removeCartItem(item.productId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-line bg-white/70 px-4 py-8 text-center text-sm text-ink-soft">
                      Cart is empty. Add detergent items to begin checkout.
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-[24px] border border-line/70 bg-white px-4 py-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-ink">Customer name</span>
                    <input
                      className="field"
                      value={saleCustomerName}
                      onChange={(event) => setSaleCustomerName(event.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-ink">Phone number</span>
                    <input
                      className="field"
                      value={saleCustomerPhone}
                      onChange={(event) => setSaleCustomerPhone(event.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-ink">Notes</span>
                    <textarea
                      className="field min-h-28"
                      value={saleNotes}
                      onChange={(event) => setSaleNotes(event.target.value)}
                      placeholder="Order notes or instructions"
                    />
                  </label>

                  <div className="rounded-[20px] bg-paper px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-ink-soft">Total</span>
                      <span className="text-2xl font-semibold text-ink">
                        {formatCurrency(cartTotalInCents)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="button-primary w-full"
                    onClick={handleCheckout}
                    disabled={pending || !cart.length}
                  >
                    {pending ? "Processing..." : "Complete sale"}
                  </button>
                </div>
              </div>
            </article>
          </motion.div>
        ) : (
          <motion.div
            key="leasing"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-5"
          >
            <article className="rounded-[28px] border border-line/70 bg-white/72 p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Machine</span>
                  <select
                    className="field"
                    value={leaseForm.machineId}
                    onChange={(event) => updateLeaseMachine(event.target.value)}
                  >
                    <option value="">Select a machine</option>
                    {availableMachines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name} · {machine.category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Customer name</span>
                  <input
                    className="field"
                    value={leaseForm.customerFullName}
                    onChange={(event) =>
                      setLeaseForm((current) => ({
                        ...current,
                        customerFullName: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Phone number</span>
                  <input
                    className="field"
                    value={leaseForm.customerPhone}
                    onChange={(event) =>
                      setLeaseForm((current) => ({
                        ...current,
                        customerPhone: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">ID number</span>
                  <input
                    className="field"
                    value={leaseForm.customerIdNumber}
                    onChange={(event) =>
                      setLeaseForm((current) => ({
                        ...current,
                        customerIdNumber: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Date out</span>
                  <input
                    className="field"
                    type="datetime-local"
                    value={leaseForm.dateOut}
                    onChange={(event) =>
                      setLeaseForm((current) => ({
                        ...current,
                        dateOut: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">
                    Expected return
                  </span>
                  <input
                    className="field"
                    type="datetime-local"
                    value={leaseForm.expectedReturnDate}
                    onChange={(event) =>
                      setLeaseForm((current) => ({
                        ...current,
                        expectedReturnDate: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Rate</span>
                  <input
                    className="field"
                    type="number"
                    min="0"
                    step="0.01"
                    value={leaseForm.rate}
                    onChange={(event) =>
                      setLeaseForm((current) => ({
                        ...current,
                        rate: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Rate unit</span>
                  <select
                    className="field"
                    value={leaseForm.rateUnit}
                    onChange={(event) =>
                      setLeaseForm((current) => ({
                        ...current,
                        rateUnit: event.target.value as "day" | "hour",
                      }))
                    }
                  >
                    <option value="day">Per day</option>
                    <option value="hour">Per hour</option>
                  </select>
                </label>

                <label className="block lg:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-ink">Notes</span>
                  <textarea
                    className="field min-h-28"
                    value={leaseForm.notes}
                    onChange={(event) =>
                      setLeaseForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                className="button-primary mt-5"
                onClick={handleLeaseSubmit}
                disabled={pending}
              >
                {pending ? "Saving lease..." : "Register lease"}
              </button>
            </article>
          </motion.div>
        )}
      </section>

      <aside className="space-y-5">
        <section className="panel px-5 py-5">
          <p className="text-lg font-semibold text-ink">Live lease queue</p>
          <p className="mt-1 text-sm text-ink-soft">
            Return active machines and generate receipts instantly.
          </p>

          <div className="mt-5 space-y-3">
            {snapshot.activeLeases.length ? (
              snapshot.activeLeases.map((lease) => (
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
                    Return & checkout
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-line bg-white/70 px-4 py-8 text-center text-sm text-ink-soft">
                No active leases at the moment.
              </div>
            )}
          </div>
        </section>

        <section className="panel px-5 py-5">
          <p className="text-lg font-semibold text-ink">Recent receipts</p>
          <div className="mt-4 space-y-3">
            {snapshot.recentReceipts.map((receipt) => (
              <a
                key={receipt.id}
                href={`/receipts/${receipt.receiptNumber}`}
                className="block rounded-[22px] border border-line/70 bg-white/72 px-4 py-4 transition hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{receipt.receiptNumber}</p>
                    <p className="text-sm text-ink-soft">{receipt.customerName}</p>
                  </div>
                  <span className="text-sm font-semibold text-ink">
                    {formatCurrency(receipt.totalInCents)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="panel px-5 py-5">
          <p className="text-lg font-semibold text-ink">Low stock watch</p>
          <div className="mt-4 space-y-3">
            {snapshot.lowStockProducts.length ? (
              snapshot.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4"
                >
                  <p className="font-semibold text-ink">{product.name}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Remaining {formatLiters(product.stockInMl)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-line/70 bg-white/70 px-4 py-6 text-sm text-ink-soft">
                All detergent lines are comfortably stocked.
              </div>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
