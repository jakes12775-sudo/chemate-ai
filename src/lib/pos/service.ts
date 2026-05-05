import "server-only";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createLeaseSchema,
  createMachineSchema,
  createProductSchema,
  createSaleSchema,
  restockProductSchema,
  returnLeaseSchema,
} from "@/lib/pos/schemas";
import { calculateLeaseCharge, calculateLineTotal, calculateSaleTotals } from "@/lib/pos/calculations";
import {
  cents,
  litersToMl,
  makeLeaseNumber,
  makeReceiptNumber,
  makeSaleNumber,
  slugify,
  toOptionalString,
} from "@/lib/pos/format";

function assertAdmin(role: UserRole) {
  if (role !== "super_admin") {
    throw new Error("Only the super admin can perform this action.");
  }
}

async function upsertCustomer(
  tx: Prisma.TransactionClient,
  input: {
    fullName: string;
    phoneNumber: string;
    idNumber?: string;
    notes?: string;
  },
) {
  const existing = await tx.customer.findFirst({
    where: {
      OR: [
        {
          phoneNumber: input.phoneNumber,
        },
        input.idNumber
          ? {
              idNumber: input.idNumber,
            }
          : undefined,
      ].filter(Boolean) as Prisma.CustomerWhereInput[],
    },
  });

  if (!existing) {
    return tx.customer.create({
      data: {
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        idNumber: input.idNumber,
        notes: input.notes,
      },
    });
  }

  return tx.customer.update({
    where: {
      id: existing.id,
    },
    data: {
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      idNumber: input.idNumber,
      notes: input.notes,
    },
  });
}

async function createOptionalSaleCustomer(
  tx: Prisma.TransactionClient,
  input: {
    customerName?: string;
    customerPhone?: string;
  },
) {
  const customerName = toOptionalString(input.customerName);
  const customerPhone = toOptionalString(input.customerPhone);

  if (!customerName || !customerPhone) {
    return null;
  }

  return upsertCustomer(tx, {
    fullName: customerName,
    phoneNumber: customerPhone,
  });
}

export async function syncOverdueLeases() {
  await prisma.lease.updateMany({
    where: {
      status: "leased_out",
      actualReturnDate: null,
      expectedReturnDate: {
        lt: new Date(),
      },
    },
    data: {
      status: "overdue",
    },
  });
}

export async function createSaleTransaction(
  payload: unknown,
  actor: {
    id: string;
    role: UserRole;
  },
) {
  const parsed = createSaleSchema.parse(payload);

  return prisma.$transaction(async (tx) => {
    const products = await tx.detergentProduct.findMany({
      where: {
        id: {
          in: parsed.items.map((item) => item.productId),
        },
        isActive: true,
      },
    });

    if (products.length !== parsed.items.length) {
      throw new Error("One or more selected products are unavailable.");
    }

    const lineItems = parsed.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);

      if (!product) {
        throw new Error("A selected product could not be found.");
      }

      const quantityInMl = litersToMl(item.quantityLiters);

      if (product.stockInMl < quantityInMl) {
        throw new Error(`Not enough stock available for ${product.name}.`);
      }

      return {
        product,
        quantityInMl,
        lineTotalInCents: calculateLineTotal(
          product.pricePerLiterInCents,
          quantityInMl,
        ),
      };
    });

    const totals = calculateSaleTotals(
      lineItems.map((item) => ({
        quantityInMl: item.quantityInMl,
        unitPricePerLiterInCents: item.product.pricePerLiterInCents,
      })),
    );

    const customer = await createOptionalSaleCustomer(tx, {
      customerName: parsed.customerName,
      customerPhone: parsed.customerPhone,
    });

    const sale = await tx.sale.create({
      data: {
        saleNumber: makeSaleNumber(),
        customerId: customer?.id,
        cashierId: actor.id,
        subtotalInCents: totals.subtotalInCents,
        totalInCents: totals.totalInCents,
        amountPaidInCents: totals.totalInCents,
        notes: toOptionalString(parsed.notes),
        lineItems: {
          create: lineItems.map((item) => ({
            productId: item.product.id,
            productNameSnapshot: item.product.name,
            quantityInMl: item.quantityInMl,
            unitPriceInCents: item.product.pricePerLiterInCents,
            lineTotalInCents: item.lineTotalInCents,
          })),
        },
      },
    });

    const receipt = await tx.receipt.create({
      data: {
        receiptNumber: makeReceiptNumber(),
        type: "sale",
        saleId: sale.id,
        issuedById: actor.id,
      },
    });

    for (const item of lineItems) {
      const updatedProduct = await tx.detergentProduct.update({
        where: {
          id: item.product.id,
        },
        data: {
          stockInMl: {
            decrement: item.quantityInMl,
          },
        },
      });

      await tx.inventoryLog.create({
        data: {
          productId: item.product.id,
          userId: actor.id,
          reason: "sale",
          quantityChangeInMl: -item.quantityInMl,
          balanceAfterInMl: updatedProduct.stockInMl,
          notes: `Linked to sale ${sale.saleNumber}.`,
        },
      });
    }

    return {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      receiptNumber: receipt.receiptNumber,
    };
  });
}

export async function createLeaseTransaction(
  payload: unknown,
  actor: {
    id: string;
    role: UserRole;
  },
) {
  const parsed = createLeaseSchema.parse(payload);
  await syncOverdueLeases();

  return prisma.$transaction(async (tx) => {
    const activeLease = await tx.lease.findFirst({
      where: {
        machineId: parsed.machineId,
        status: {
          in: ["leased_out", "overdue"],
        },
      },
    });

    if (activeLease) {
      throw new Error("That machine is already leased out.");
    }

    const machine = await tx.machine.findUnique({
      where: {
        id: parsed.machineId,
      },
    });

    if (!machine || !machine.isActive) {
      throw new Error("The selected machine is unavailable.");
    }

    const customer = await upsertCustomer(tx, {
      fullName: parsed.customerFullName,
      phoneNumber: parsed.customerPhone,
      idNumber: parsed.customerIdNumber,
      notes: toOptionalString(parsed.notes),
    });

    const lease = await tx.lease.create({
      data: {
        leaseNumber: makeLeaseNumber(),
        machineId: machine.id,
        customerId: customer.id,
        cashierId: actor.id,
        notes: toOptionalString(parsed.notes),
        dateOut: parsed.dateOut,
        expectedReturnDate: parsed.expectedReturnDate,
        rateInCents: cents(parsed.rate),
        rateUnit: parsed.rateUnit,
      },
    });

    return {
      leaseId: lease.id,
      leaseNumber: lease.leaseNumber,
    };
  });
}

export async function returnLeaseTransaction(
  leaseId: string,
  payload: unknown,
  actor: {
    id: string;
    role: UserRole;
  },
) {
  const parsed = returnLeaseSchema.parse(payload);
  await syncOverdueLeases();

  return prisma.$transaction(async (tx) => {
    const lease = await tx.lease.findUnique({
      where: {
        id: leaseId,
      },
    });

    if (!lease) {
      throw new Error("Lease record not found.");
    }

    if (lease.status === "returned") {
      const existingReceipt = await tx.receipt.findUnique({
        where: {
          leaseId: lease.id,
        },
      });

      return {
        leaseId: lease.id,
        leaseNumber: lease.leaseNumber,
        receiptNumber: existingReceipt?.receiptNumber,
      };
    }

    const actualReturnDate = parsed.actualReturnDate ?? new Date();
    const charge = calculateLeaseCharge({
      dateOut: lease.dateOut,
      actualReturnDate,
      rateUnit: lease.rateUnit,
      rateInCents: lease.rateInCents,
    });

    const updatedLease = await tx.lease.update({
      where: {
        id: lease.id,
      },
      data: {
        actualReturnDate,
        billableUnits: charge.billableUnits,
        totalAmountInCents: charge.totalAmountInCents,
        status: "returned",
        paymentStatus: "paid",
      },
    });

    const receipt = await tx.receipt.create({
      data: {
        receiptNumber: makeReceiptNumber(),
        type: "lease",
        leaseId: lease.id,
        issuedById: actor.id,
      },
    });

    return {
      leaseId: updatedLease.id,
      leaseNumber: updatedLease.leaseNumber,
      receiptNumber: receipt.receiptNumber,
    };
  });
}

export async function createProductRecord(
  payload: unknown,
  actor: {
    id: string;
    role: UserRole;
  },
) {
  assertAdmin(actor.role);
  const parsed = createProductSchema.parse(payload);

  return prisma.$transaction(async (tx) => {
    const product = await tx.detergentProduct.create({
      data: {
        name: parsed.name,
        sku: toOptionalString(parsed.sku) ?? slugify(parsed.name).toUpperCase(),
        description: toOptionalString(parsed.description),
        pricePerLiterInCents: cents(parsed.pricePerLiter),
        stockInMl: litersToMl(parsed.stockLiters),
        lowStockThresholdInMl: litersToMl(parsed.lowStockThresholdLiters),
      },
    });

    if (product.stockInMl > 0) {
      await tx.inventoryLog.create({
        data: {
          productId: product.id,
          userId: actor.id,
          reason: "initial_stock",
          quantityChangeInMl: product.stockInMl,
          balanceAfterInMl: product.stockInMl,
          notes: "Opening stock captured on product creation.",
        },
      });
    }

    return product;
  });
}

export async function restockProductRecord(
  productId: string,
  payload: unknown,
  actor: {
    id: string;
    role: UserRole;
  },
) {
  assertAdmin(actor.role);
  const parsed = restockProductSchema.parse(payload);
  const quantityInMl = litersToMl(parsed.quantityLiters);

  return prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.detergentProduct.update({
      where: {
        id: productId,
      },
      data: {
        stockInMl: {
          increment: quantityInMl,
        },
      },
    });

    await tx.inventoryLog.create({
      data: {
        productId,
        userId: actor.id,
        reason: "restock",
        quantityChangeInMl: quantityInMl,
        balanceAfterInMl: updatedProduct.stockInMl,
        notes: toOptionalString(parsed.notes),
      },
    });

    return updatedProduct;
  });
}

export async function createMachineRecord(
  payload: unknown,
  actor: {
    id: string;
    role: UserRole;
  },
) {
  assertAdmin(actor.role);
  const parsed = createMachineSchema.parse(payload);

  return prisma.machine.create({
    data: {
      name: parsed.name,
      category: parsed.category,
      description: toOptionalString(parsed.description),
      defaultRateInCents: cents(parsed.defaultRate),
      rateUnit: parsed.rateUnit,
      slug: slugify(parsed.name),
    },
  });
}
