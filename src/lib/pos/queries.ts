import "server-only";
import { prisma } from "@/lib/prisma";
import { buildRevenueTimeline } from "@/lib/pos/calculations";
import { syncOverdueLeases } from "@/lib/pos/service";
import type {
  DashboardSnapshot,
  InventoryLogSnapshot,
  InventorySnapshot,
  LeasingSnapshot,
  LeaseSnapshot,
  MachineSnapshot,
  PosSnapshot,
  ProductSnapshot,
  ReceiptDetail,
  ReceiptSummary,
} from "@/lib/pos/types";

function serializeProduct(product: {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  pricePerLiterInCents: number;
  stockInMl: number;
  lowStockThresholdInMl: number;
}) : ProductSnapshot {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description ?? undefined,
    pricePerLiterInCents: product.pricePerLiterInCents,
    stockInMl: product.stockInMl,
    lowStockThresholdInMl: product.lowStockThresholdInMl,
    isLowStock: product.stockInMl <= product.lowStockThresholdInMl,
  };
}

function serializeMachine(
  machine: {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string | null;
    defaultRateInCents: number;
    rateUnit: "hour" | "day";
    isActive: boolean;
  },
  activeMachineIds: Set<string>,
): MachineSnapshot {
  return {
    id: machine.id,
    name: machine.name,
    slug: machine.slug,
    category: machine.category,
    description: machine.description ?? undefined,
    defaultRateInCents: machine.defaultRateInCents,
    rateUnit: machine.rateUnit,
    isActive: machine.isActive,
    isAvailable: machine.isActive && !activeMachineIds.has(machine.id),
  };
}

function serializeLease(lease: {
  id: string;
  leaseNumber: string;
  notes: string | null;
  dateOut: Date;
  expectedReturnDate: Date;
  actualReturnDate: Date | null;
  rateInCents: number;
  rateUnit: "hour" | "day";
  billableUnits: number | null;
  totalAmountInCents: number | null;
  status: "leased_out" | "overdue" | "returned";
  paymentStatus: "pending" | "paid";
  machine: {
    name: string;
    category: string;
  };
  customer: {
    fullName: string;
    phoneNumber: string;
    idNumber: string | null;
  };
}): LeaseSnapshot {
  return {
    id: lease.id,
    leaseNumber: lease.leaseNumber,
    machineName: lease.machine.name,
    machineCategory: lease.machine.category,
    customerName: lease.customer.fullName,
    phoneNumber: lease.customer.phoneNumber,
    idNumber: lease.customer.idNumber ?? undefined,
    notes: lease.notes ?? undefined,
    dateOut: lease.dateOut.toISOString(),
    expectedReturnDate: lease.expectedReturnDate.toISOString(),
    actualReturnDate: lease.actualReturnDate?.toISOString(),
    rateInCents: lease.rateInCents,
    rateUnit: lease.rateUnit,
    billableUnits: lease.billableUnits ?? undefined,
    totalAmountInCents: lease.totalAmountInCents ?? undefined,
    status: lease.status,
    paymentStatus: lease.paymentStatus,
  };
}

function serializeReceiptSummary(receipt: {
  id: string;
  receiptNumber: string;
  type: "sale" | "lease";
  createdAt: Date;
  sale: {
    totalInCents: number;
    customer: {
      fullName: string;
    } | null;
    lineItems: Array<{
      productNameSnapshot: string;
    }>;
  } | null;
  lease: {
    totalAmountInCents: number | null;
    customer: {
      fullName: string;
    };
    machine: {
      name: string;
    };
  } | null;
}): ReceiptSummary {
  if (receipt.type === "sale" && receipt.sale) {
    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      type: receipt.type,
      createdAt: receipt.createdAt.toISOString(),
      customerName: receipt.sale.customer?.fullName ?? "Walk-in customer",
      totalInCents: receipt.sale.totalInCents,
      summary: receipt.sale.lineItems
        .map((item) => item.productNameSnapshot)
        .slice(0, 2)
        .join(", "),
    };
  }

  if (receipt.lease) {
    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      type: receipt.type,
      createdAt: receipt.createdAt.toISOString(),
      customerName: receipt.lease.customer.fullName,
      totalInCents: receipt.lease.totalAmountInCents ?? 0,
      summary: receipt.lease.machine.name,
    };
  }

  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    type: receipt.type,
    createdAt: receipt.createdAt.toISOString(),
    customerName: "Unknown customer",
    totalInCents: 0,
    summary: "Transaction summary unavailable",
  };
}

function serializeInventoryLog(log: {
  id: string;
  reason: string;
  quantityChangeInMl: number;
  balanceAfterInMl: number;
  notes: string | null;
  createdAt: Date;
  product: {
    name: string;
  };
  user: {
    name: string;
  };
}): InventoryLogSnapshot {
  return {
    id: log.id,
    productName: log.product.name,
    reason: log.reason.replace(/_/g, " "),
    quantityChangeInMl: log.quantityChangeInMl,
    balanceAfterInMl: log.balanceAfterInMl,
    actorName: log.user.name,
    notes: log.notes ?? undefined,
    createdAt: log.createdAt.toISOString(),
  };
}

async function getCommonCollections() {
  await syncOverdueLeases();

  const [products, machines, activeLeases, recentReceipts] = await prisma.$transaction([
    prisma.detergentProduct.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.machine.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.lease.findMany({
      where: {
        status: {
          in: ["leased_out", "overdue"],
        },
      },
      include: {
        machine: true,
        customer: true,
      },
      orderBy: {
        expectedReturnDate: "asc",
      },
    }),
    prisma.receipt.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      include: {
        sale: {
          include: {
            customer: true,
            lineItems: true,
          },
        },
        lease: {
          include: {
            customer: true,
            machine: true,
          },
        },
      },
    }),
  ]);

  const activeMachineIds = new Set(activeLeases.map((lease) => lease.machineId));

  return {
    products: products.map(serializeProduct),
    machines: machines.map((machine) => serializeMachine(machine, activeMachineIds)),
    activeLeases: activeLeases.map(serializeLease),
    recentReceipts: recentReceipts.map(serializeReceiptSummary),
  };
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const common = await getCommonCollections();

  const [sales, leases, allReceipts] = await prisma.$transaction([
    prisma.sale.findMany({
      select: {
        totalInCents: true,
      },
    }),
    prisma.lease.findMany({
      select: {
        totalAmountInCents: true,
        status: true,
      },
    }),
    prisma.receipt.findMany({
      include: {
        sale: {
          select: {
            totalInCents: true,
          },
        },
        lease: {
          select: {
            totalAmountInCents: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  const salesRevenueInCents = sales.reduce(
    (sum, sale) => sum + sale.totalInCents,
    0,
  );
  const leasingRevenueInCents = leases.reduce(
    (sum, lease) => sum + (lease.totalAmountInCents ?? 0),
    0,
  );

  const overdueLeasesList = common.activeLeases.filter(
    (lease) => lease.status === "overdue",
  );
  const lowStockProducts = common.products.filter((product) => product.isLowStock);

  return {
    revenueTimeline: buildRevenueTimeline(
      allReceipts.map((receipt) => ({
        createdAt: receipt.createdAt,
        totalInCents:
          receipt.type === "sale"
            ? receipt.sale?.totalInCents ?? 0
            : receipt.lease?.totalAmountInCents ?? 0,
        type: receipt.type,
      })),
    ),
    metrics: {
      totalRevenueInCents: salesRevenueInCents + leasingRevenueInCents,
      salesRevenueInCents,
      leasingRevenueInCents,
      totalSales: sales.length,
      totalLeases: leases.length,
      activeLeases: common.activeLeases.length,
      overdueLeases: overdueLeasesList.length,
      lowStockProducts: lowStockProducts.length,
      availableMachines: common.machines.filter((machine) => machine.isAvailable).length,
    },
    lowStockProducts,
    activeLeases: common.activeLeases,
    overdueLeasesList,
    recentReceipts: common.recentReceipts,
    machines: common.machines,
  };
}

export async function getPosSnapshot(): Promise<PosSnapshot> {
  const common = await getCommonCollections();

  return {
    products: common.products,
    machines: common.machines,
    activeLeases: common.activeLeases,
    recentReceipts: common.recentReceipts,
    lowStockProducts: common.products.filter((product) => product.isLowStock),
  };
}

export async function getInventorySnapshot(): Promise<InventorySnapshot> {
  await syncOverdueLeases();

  const [products, logs] = await prisma.$transaction([
    prisma.detergentProduct.findMany({
      orderBy: {
        name: "asc",
      },
    }),
    prisma.inventoryLog.findMany({
      take: 12,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: true,
        user: true,
      },
    }),
  ]);

  return {
    products: products.map(serializeProduct),
    recentLogs: logs.map(serializeInventoryLog),
  };
}

export async function getLeasingSnapshot(): Promise<LeasingSnapshot> {
  const common = await getCommonCollections();
  const leaseHistory = await prisma.lease.findMany({
    include: {
      machine: true,
      customer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  return {
    activeLeases: common.activeLeases,
    leaseHistory: leaseHistory.map(serializeLease),
    machines: common.machines,
  };
}

export async function getReceiptsSnapshot() {
  await syncOverdueLeases();

  const receipts = await prisma.receipt.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      sale: {
        include: {
          customer: true,
          lineItems: true,
        },
      },
      lease: {
        include: {
          customer: true,
          machine: true,
        },
      },
    },
  });

  return receipts.map(serializeReceiptSummary);
}

export async function getReceiptDetail(
  receiptNumber: string,
): Promise<ReceiptDetail | null> {
  await syncOverdueLeases();

  const receipt = await prisma.receipt.findUnique({
    where: {
      receiptNumber,
    },
    include: {
      issuedBy: true,
      sale: {
        include: {
          customer: true,
          lineItems: true,
        },
      },
      lease: {
        include: {
          customer: true,
          machine: true,
        },
      },
    },
  });

  if (!receipt) {
    return null;
  }

  return {
    receiptNumber: receipt.receiptNumber,
    type: receipt.type,
    createdAt: receipt.createdAt.toISOString(),
    issuedBy: {
      name: receipt.issuedBy.name,
      email: receipt.issuedBy.email,
    },
    lease: receipt.lease
      ? {
          leaseNumber: receipt.lease.leaseNumber,
          customerName: receipt.lease.customer.fullName,
          phoneNumber: receipt.lease.customer.phoneNumber,
          idNumber: receipt.lease.customer.idNumber ?? undefined,
          machineName: receipt.lease.machine.name,
          dateOut: receipt.lease.dateOut.toISOString(),
          expectedReturnDate: receipt.lease.expectedReturnDate.toISOString(),
          actualReturnDate: receipt.lease.actualReturnDate?.toISOString(),
          rateInCents: receipt.lease.rateInCents,
          rateUnit: receipt.lease.rateUnit,
          billableUnits: receipt.lease.billableUnits ?? 0,
          totalAmountInCents: receipt.lease.totalAmountInCents ?? 0,
          notes: receipt.lease.notes ?? undefined,
        }
      : undefined,
    sale: receipt.sale
      ? {
          saleNumber: receipt.sale.saleNumber,
          customerName: receipt.sale.customer?.fullName ?? undefined,
          phoneNumber: receipt.sale.customer?.phoneNumber ?? undefined,
          notes: receipt.sale.notes ?? undefined,
          totalInCents: receipt.sale.totalInCents,
          amountPaidInCents: receipt.sale.amountPaidInCents,
          items: receipt.sale.lineItems.map((item) => ({
            id: item.id,
            productName: item.productNameSnapshot,
            quantityInMl: item.quantityInMl,
            unitPriceInCents: item.unitPriceInCents,
            lineTotalInCents: item.lineTotalInCents,
          })),
        }
      : undefined,
  };
}

export async function exportTransactionsCsv() {
  await syncOverdueLeases();

  const receipts = await prisma.receipt.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      sale: {
        include: {
          customer: true,
        },
      },
      lease: {
        include: {
          customer: true,
          machine: true,
        },
      },
    },
  });

  const header = [
    "receipt_number",
    "type",
    "created_at",
    "customer_name",
    "reference",
    "total_kes",
  ];

  const rows = receipts.map((receipt) => [
    receipt.receiptNumber,
    receipt.type,
    receipt.createdAt.toISOString(),
    receipt.type === "sale"
      ? receipt.sale?.customer?.fullName ?? "Walk-in customer"
      : receipt.lease?.customer.fullName ?? "",
    receipt.type === "sale"
      ? receipt.sale?.saleNumber ?? ""
      : receipt.lease?.leaseNumber ?? "",
    String(
      (
        receipt.type === "sale"
          ? receipt.sale?.totalInCents ?? 0
          : receipt.lease?.totalAmountInCents ?? 0
      ) / 100,
    ),
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
