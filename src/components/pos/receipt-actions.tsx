"use client";

import { Download, Printer } from "lucide-react";

export function ReceiptActions({ receiptNumber }: { receiptNumber: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className="button-primary"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        Print receipt
      </button>
      <a
        className="button-secondary"
        href={`/api/receipts/${receiptNumber}/pdf`}
      >
        <Download className="h-4 w-4" />
        Download PDF
      </a>
    </div>
  );
}
