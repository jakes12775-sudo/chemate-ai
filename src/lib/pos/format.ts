const currencyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-KE", {
  maximumFractionDigits: 2,
});

export function cents(amountInKes: number) {
  return Math.round(amountInKes * 100);
}

export function formatCurrency(amountInCents: number) {
  return currencyFormatter.format(amountInCents / 100);
}

export function formatCompactCurrency(amountInCents: number) {
  return compactCurrencyFormatter.format(amountInCents / 100);
}

export function litersToMl(liters: number) {
  return Math.round(liters * 1000);
}

export function mlToLiters(ml: number) {
  return ml / 1000;
}

export function formatLiters(ml: number) {
  return `${numberFormatter.format(mlToLiters(ml))} L`;
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildSequence(seed?: number, date = new Date()) {
  if (typeof seed === "number") {
    return String(seed).padStart(3, "0");
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 90) + 10);

  return `${hours}${minutes}${seconds}${random}`;
}

function buildDateToken(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function makeSaleNumber(seed?: number, date = new Date()) {
  return `SAL-${buildDateToken(date)}-${buildSequence(seed, date)}`;
}

export function makeLeaseNumber(seed?: number, date = new Date()) {
  return `LSE-${buildDateToken(date)}-${buildSequence(seed, date)}`;
}

export function makeReceiptNumber(seed?: number, date = new Date()) {
  return `RCPT-${buildDateToken(date)}-${buildSequence(seed, date)}`;
}
