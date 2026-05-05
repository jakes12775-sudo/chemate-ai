import type {
  LeaseStatus,
  PaymentStatus,
  RateUnit,
  ReceiptType,
  UserRole,
} from "@prisma/client";

export interface SessionUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface RevenuePoint {
  key: string;
  label: string;
  salesInCents: number;
  leaseInCents: number;
  totalInCents: number;
}

export interface DashboardMetric {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
}

export interface ProductSnapshot {
  id: string;
  name: string;
  sku: string;
  description?: string;
  pricePerLiterInCents: number;
  stockInMl: number;
  lowStockThresholdInMl: number;
  isLowStock: boolean;
}

export interface MachineSnapshot {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  defaultRateInCents: number;
  rateUnit: RateUnit;
  isActive: boolean;
  isAvailable: boolean;
}

export interface LeaseSnapshot {
  id: string;
  leaseNumber: string;
  machineName: string;
  machineCategory: string;
  customerName: string;
  phoneNumber: string;
  idNumber?: string;
  notes?: string;
  dateOut: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  rateInCents: number;
  rateUnit: RateUnit;
  billableUnits?: number;
  totalAmountInCents?: number;
  status: LeaseStatus;
  paymentStatus: PaymentStatus;
}

export interface InventoryLogSnapshot {
  id: string;
  productName: string;
  reason: string;
  quantityChangeInMl: number;
  balanceAfterInMl: number;
  actorName: string;
  notes?: string;
  createdAt: string;
}

export interface ReceiptSummary {
  id: string;
  receiptNumber: string;
  type: ReceiptType;
  createdAt: string;
  customerName: string;
  totalInCents: number;
  summary: string;
}

export interface DashboardSnapshot {
  revenueTimeline: RevenuePoint[];
  metrics: {
    totalRevenueInCents: number;
    salesRevenueInCents: number;
    leasingRevenueInCents: number;
    totalSales: number;
    totalLeases: number;
    activeLeases: number;
    overdueLeases: number;
    lowStockProducts: number;
    availableMachines: number;
  };
  lowStockProducts: ProductSnapshot[];
  activeLeases: LeaseSnapshot[];
  overdueLeasesList: LeaseSnapshot[];
  recentReceipts: ReceiptSummary[];
  machines: MachineSnapshot[];
}

export interface PosSnapshot {
  products: ProductSnapshot[];
  machines: MachineSnapshot[];
  activeLeases: LeaseSnapshot[];
  recentReceipts: ReceiptSummary[];
  lowStockProducts: ProductSnapshot[];
}

export interface InventorySnapshot {
  products: ProductSnapshot[];
  recentLogs: InventoryLogSnapshot[];
}

export interface LeasingSnapshot {
  activeLeases: LeaseSnapshot[];
  leaseHistory: LeaseSnapshot[];
  machines: MachineSnapshot[];
}

export interface ReceiptDetail {
  receiptNumber: string;
  type: ReceiptType;
  createdAt: string;
  issuedBy: {
    name: string;
    email: string;
  };
  lease?: {
    leaseNumber: string;
    customerName: string;
    phoneNumber: string;
    idNumber?: string;
    machineName: string;
    dateOut: string;
    expectedReturnDate: string;
    actualReturnDate?: string;
    rateInCents: number;
    rateUnit: RateUnit;
    billableUnits: number;
    totalAmountInCents: number;
    notes?: string;
  };
  sale?: {
    saleNumber: string;
    customerName?: string;
    phoneNumber?: string;
    notes?: string;
    totalInCents: number;
    amountPaidInCents: number;
    items: Array<{
      id: string;
      productName: string;
      quantityInMl: number;
      unitPriceInCents: number;
      lineTotalInCents: number;
    }>;
  };
}
