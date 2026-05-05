"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime, formatLiters } from "@/lib/pos/format";
import type { InventorySnapshot } from "@/lib/pos/types";

export function InventoryView({ snapshot }: { snapshot: InventorySnapshot }) {
  const router = useRouter();
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    description: "",
    pricePerLiter: "",
    stockLiters: "",
    lowStockThresholdLiters: "5",
  });
  const [restockValues, setRestockValues] = useState<Record<string, string>>({});
  const [restockNotes, setRestockNotes] = useState<Record<string, string>>({});
  const [pending, startUiTransition] = useTransition();

  async function handleCreateProduct() {
    startUiTransition(async () => {
      const response = await fetch("/api/pos/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProduct),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "Could not create the product.");
        return;
      }

      toast.success("Product created successfully.");
      setNewProduct({
        name: "",
        sku: "",
        description: "",
        pricePerLiter: "",
        stockLiters: "",
        lowStockThresholdLiters: "5",
      });
      router.refresh();
    });
  }

  async function handleRestock(productId: string) {
    startUiTransition(async () => {
      const response = await fetch(`/api/pos/products/${productId}/restock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantityLiters: restockValues[productId] ?? "0.5",
          notes: restockNotes[productId] ?? "",
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "Could not restock this product.");
        return;
      }

      toast.success("Inventory updated.");
      setRestockValues((current) => ({
        ...current,
        [productId]: "0.5",
      }));
      setRestockNotes((current) => ({
        ...current,
        [productId]: "",
      }));
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-5">
        <article className="panel px-5 py-5">
          <div className="flex items-center gap-3">
            <PackagePlus className="h-5 w-5 text-accent" />
            <div>
              <p className="text-lg font-semibold text-ink">Add detergent line</p>
              <p className="text-sm text-ink-soft">
                Capture new products with price per liter and safety stock thresholds.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <input
              className="field"
              placeholder="Product name"
              value={newProduct.name}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              className="field"
              placeholder="SKU (optional)"
              value={newProduct.sku}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, sku: event.target.value }))
              }
            />
            <input
              className="field lg:col-span-2"
              placeholder="Description"
              value={newProduct.description}
              onChange={(event) =>
                setNewProduct((current) => ({
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
              placeholder="Price per liter"
              value={newProduct.pricePerLiter}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  pricePerLiter: event.target.value,
                }))
              }
            />
            <input
              className="field"
              type="number"
              min="0"
              step="0.5"
              placeholder="Opening stock liters"
              value={newProduct.stockLiters}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  stockLiters: event.target.value,
                }))
              }
            />
            <input
              className="field"
              type="number"
              min="0.5"
              step="0.5"
              placeholder="Low stock threshold liters"
              value={newProduct.lowStockThresholdLiters}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  lowStockThresholdLiters: event.target.value,
                }))
              }
            />
          </div>

          <button
            type="button"
            className="button-primary mt-5"
            onClick={handleCreateProduct}
            disabled={pending}
          >
            {pending ? "Saving..." : "Create product"}
          </button>
        </article>

        <article className="grid gap-4 lg:grid-cols-2">
          {snapshot.products.map((product) => (
            <div key={product.id} className="panel px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-ink">{product.name}</p>
                  <p className="mt-1 text-sm text-ink-soft">{product.sku}</p>
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

              <p className="mt-4 text-sm text-ink-soft">{product.description}</p>
              <p className="mt-4 text-sm font-semibold text-ink">
                {formatCurrency(product.pricePerLiterInCents)} per liter
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Low stock threshold {formatLiters(product.lowStockThresholdInMl)}
              </p>

              <div className="mt-5 space-y-3">
                <input
                  className="field"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={restockValues[product.id] ?? "0.5"}
                  onChange={(event) =>
                    setRestockValues((current) => ({
                      ...current,
                      [product.id]: event.target.value,
                    }))
                  }
                />
                <input
                  className="field"
                  placeholder="Restock note"
                  value={restockNotes[product.id] ?? ""}
                  onChange={(event) =>
                    setRestockNotes((current) => ({
                      ...current,
                      [product.id]: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className="button-secondary w-full"
                  onClick={() => void handleRestock(product.id)}
                  disabled={pending}
                >
                  Restock product
                </button>
              </div>
            </div>
          ))}
        </article>
      </section>

      <aside className="panel px-5 py-5">
        <div className="flex items-center gap-3">
          <Box className="h-5 w-5 text-sea" />
          <div>
            <p className="text-lg font-semibold text-ink">Recent stock movement</p>
            <p className="text-sm text-ink-soft">
              Last adjustments, sales deductions, and restocks.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {snapshot.recentLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-[22px] border border-line/70 bg-white/72 px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{log.productName}</p>
                  <p className="text-sm text-ink-soft">
                    {log.reason} · {log.actorName}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    log.quantityChangeInMl > 0 ? "text-accent" : "text-rose-600"
                  }`}
                >
                  {log.quantityChangeInMl > 0 ? "+" : ""}
                  {formatLiters(log.quantityChangeInMl)}
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                Balance {formatLiters(log.balanceAfterInMl)} · {formatDateTime(log.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
