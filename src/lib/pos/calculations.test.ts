import { describe, expect, it } from "vitest";
import {
  buildRevenueTimeline,
  calculateBillableUnits,
  calculateLeaseCharge,
  calculateSaleTotals,
} from "@/lib/pos/calculations";

describe("POS calculations", () => {
  it("rounds lease duration up to the next billable day", () => {
    expect(
      calculateBillableUnits(
        "2026-04-20T08:00:00.000Z",
        "2026-04-21T09:15:00.000Z",
        "day",
      ),
    ).toBe(2);
  });

  it("computes lease totals from duration and rate", () => {
    expect(
      calculateLeaseCharge({
        dateOut: "2026-04-20T08:00:00.000Z",
        actualReturnDate: "2026-04-20T11:30:00.000Z",
        rateUnit: "hour",
        rateInCents: 120000,
      }),
    ).toEqual({
      billableUnits: 4,
      totalAmountInCents: 480000,
    });
  });

  it("sums detergent line totals correctly", () => {
    expect(
      calculateSaleTotals([
        {
          quantityInMl: 1500,
          unitPricePerLiterInCents: 45000,
        },
        {
          quantityInMl: 500,
          unitPricePerLiterInCents: 38000,
        },
      ]),
    ).toEqual({
      subtotalInCents: 86500,
      totalInCents: 86500,
    });
  });

  it("builds daily revenue timeline buckets", () => {
    const points = buildRevenueTimeline(
      [
        {
          createdAt: new Date(),
          totalInCents: 50000,
          type: "sale",
        },
        {
          createdAt: new Date(),
          totalInCents: 70000,
          type: "lease",
        },
      ],
      1,
    );

    expect(points[0]).toMatchObject({
      salesInCents: 50000,
      leaseInCents: 70000,
      totalInCents: 120000,
    });
  });
});
