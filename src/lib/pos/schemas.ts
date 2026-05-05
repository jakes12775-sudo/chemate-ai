import { z } from "zod";

const litersField = z
  .coerce.number()
  .min(0.5)
  .refine((value) => Number.isInteger(value * 2), {
    message: "Quantities must be in 0.5 liter steps.",
  });

export const createSaleSchema = z.object({
  customerName: z.string().trim().max(120).optional(),
  customerPhone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(240).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantityLiters: litersField,
      }),
    )
    .min(1),
});

export const createLeaseSchema = z
  .object({
    machineId: z.string().min(1),
    customerFullName: z.string().trim().min(3).max(120),
    customerPhone: z.string().trim().min(6).max(40),
    customerIdNumber: z.string().trim().min(5).max(30),
    notes: z.string().trim().max(240).optional(),
    dateOut: z.coerce.date(),
    expectedReturnDate: z.coerce.date(),
    rate: z.coerce.number().positive(),
    rateUnit: z.enum(["day", "hour"]),
  })
  .refine((value) => value.expectedReturnDate > value.dateOut, {
    message: "Expected return date must be later than the date out.",
    path: ["expectedReturnDate"],
  });

export const returnLeaseSchema = z.object({
  actualReturnDate: z.coerce.date().optional(),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(3).max(120),
  sku: z.string().trim().min(3).max(32).optional(),
  description: z.string().trim().max(240).optional(),
  pricePerLiter: z.coerce.number().positive(),
  stockLiters: z.coerce.number().min(0),
  lowStockThresholdLiters: z.coerce.number().positive().default(5),
});

export const restockProductSchema = z.object({
  quantityLiters: litersField,
  notes: z.string().trim().max(240).optional(),
});

export const createMachineSchema = z.object({
  name: z.string().trim().min(3).max(120),
  category: z.string().trim().min(3).max(80),
  description: z.string().trim().max(240).optional(),
  defaultRate: z.coerce.number().positive(),
  rateUnit: z.enum(["day", "hour"]),
});
