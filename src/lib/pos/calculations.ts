import type { RateUnit } from "@prisma/client";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function calculateBillableUnits(
  dateOut: Date | string,
  actualReturnDate: Date | string,
  rateUnit: RateUnit,
) {
  const start = new Date(dateOut).getTime();
  const end = new Date(actualReturnDate).getTime();
  const elapsedMs = Math.max(end - start, 0);
  const unitMs = rateUnit === "hour" ? HOUR_MS : DAY_MS;

  return Math.max(1, Math.ceil(elapsedMs / unitMs));
}

export function calculateLeaseCharge(input: {
  dateOut: Date | string;
  actualReturnDate: Date | string;
  rateUnit: RateUnit;
  rateInCents: number;
}) {
  const billableUnits = calculateBillableUnits(
    input.dateOut,
    input.actualReturnDate,
    input.rateUnit,
  );

  return {
    billableUnits,
    totalAmountInCents: billableUnits * input.rateInCents,
  };
}

export function calculateLineTotal(
  unitPricePerLiterInCents: number,
  quantityInMl: number,
) {
  return Math.round((unitPricePerLiterInCents * quantityInMl) / 1000);
}

export function calculateSaleTotals(
  items: Array<{
    quantityInMl: number;
    unitPricePerLiterInCents: number;
  }>,
) {
  const subtotalInCents = items.reduce(
    (sum, item) =>
      sum + calculateLineTotal(item.unitPricePerLiterInCents, item.quantityInMl),
    0,
  );

  return {
    subtotalInCents,
    totalInCents: subtotalInCents,
  };
}

function toLocalDateKey(value: Date | string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function buildRevenueTimeline(
  entries: Array<{
    createdAt: Date | string;
    totalInCents: number;
    type: "sale" | "lease";
  }>,
  numberOfDays = 7,
) {
  const buckets = Array.from({ length: numberOfDays }, (_, index) => {
    const bucketDate = new Date();
    bucketDate.setHours(0, 0, 0, 0);
    bucketDate.setDate(bucketDate.getDate() - (numberOfDays - index - 1));

    return {
      key: toLocalDateKey(bucketDate),
      label: bucketDate.toLocaleDateString("en-KE", {
        month: "short",
        day: "numeric",
      }),
      salesInCents: 0,
      leaseInCents: 0,
      totalInCents: 0,
    };
  });

  for (const entry of entries) {
    const key = toLocalDateKey(entry.createdAt);
    const bucket = buckets.find((candidate) => candidate.key === key);

    if (!bucket) {
      continue;
    }

    if (entry.type === "sale") {
      bucket.salesInCents += entry.totalInCents;
    } else {
      bucket.leaseInCents += entry.totalInCents;
    }

    bucket.totalInCents += entry.totalInCents;
  }

  return buckets;
}
