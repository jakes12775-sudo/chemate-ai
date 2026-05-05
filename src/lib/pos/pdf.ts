import "server-only";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { companyProfile } from "@/lib/pos/brand";
import { formatCurrency, formatDateTime, formatLiters } from "@/lib/pos/format";
import type { ReceiptDetail } from "@/lib/pos/types";

function drawLine(page: PDFPage, y: number) {
  page.drawLine({
    start: { x: 48, y },
    end: { x: 547, y },
    thickness: 1,
    color: rgb(0.86, 0.9, 0.94),
  });
}

function drawWrappedText(params: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
}) {
  const words = params.text.split(/\s+/);
  let line = "";
  let currentY = params.y;

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    const width = params.font.widthOfTextAtSize(nextLine, params.size);

    if (width > params.maxWidth && line) {
      params.page.drawText(line, {
        x: params.x,
        y: currentY,
        size: params.size,
        font: params.font,
        color: params.color ?? rgb(0.11, 0.16, 0.22),
      });
      currentY -= params.lineHeight;
      line = word;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    params.page.drawText(line, {
      x: params.x,
      y: currentY,
      size: params.size,
      font: params.font,
      color: params.color ?? rgb(0.11, 0.16, 0.22),
    });
  }

  return currentY;
}

export async function buildReceiptPdf(detail: ReceiptDetail) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logoPath = path.join(process.cwd(), "public", "brand", "ezzclean-logo.jpeg");
  const logoBytes = await readFile(logoPath);
  const logo = await pdfDoc.embedJpg(logoBytes);

  page.drawImage(logo, {
    x: 44,
    y: 760,
    width: 120,
    height: 82,
  });

  page.drawText(companyProfile.name, {
    x: 180,
    y: 805,
    size: 16,
    font: bold,
    color: rgb(0.04, 0.3, 0.47),
  });
  page.drawText(companyProfile.address, {
    x: 180,
    y: 787,
    size: 10,
    font: regular,
    color: rgb(0.32, 0.39, 0.45),
  });
  page.drawText(`Phone: ${companyProfile.phone}`, {
    x: 180,
    y: 772,
    size: 10,
    font: regular,
    color: rgb(0.32, 0.39, 0.45),
  });
  page.drawText(`Email: ${companyProfile.email}`, {
    x: 180,
    y: 757,
    size: 10,
    font: regular,
    color: rgb(0.32, 0.39, 0.45),
  });

  drawLine(page, 742);

  page.drawText("Official POS Receipt", {
    x: 48,
    y: 718,
    size: 18,
    font: bold,
    color: rgb(0.07, 0.24, 0.17),
  });
  page.drawText(`Receipt No: ${detail.receiptNumber}`, {
    x: 48,
    y: 698,
    size: 11,
    font: regular,
  });
  page.drawText(`Issued: ${formatDateTime(detail.createdAt)}`, {
    x: 48,
    y: 682,
    size: 11,
    font: regular,
  });
  page.drawText(`Served by: ${detail.issuedBy.name}`, {
    x: 48,
    y: 666,
    size: 11,
    font: regular,
  });
  page.drawText(`Transaction: ${detail.type === "sale" ? "Detergent Sale" : "Machine Lease"}`, {
    x: 360,
    y: 698,
    size: 11,
    font: regular,
  });

  drawLine(page, 648);

  let cursorY = 624;

  if (detail.sale) {
    page.drawText("Customer", {
      x: 48,
      y: cursorY,
      size: 12,
      font: bold,
    });
    cursorY -= 18;
    page.drawText(detail.sale.customerName ?? "Walk-in customer", {
      x: 48,
      y: cursorY,
      size: 11,
      font: regular,
    });
    if (detail.sale.phoneNumber) {
      cursorY -= 14;
      page.drawText(detail.sale.phoneNumber, {
        x: 48,
        y: cursorY,
        size: 10,
        font: regular,
      });
    }

    cursorY -= 28;
    page.drawText("Items", {
      x: 48,
      y: cursorY,
      size: 12,
      font: bold,
    });
    cursorY -= 18;

    page.drawText("Product", {
      x: 48,
      y: cursorY,
      size: 10,
      font: bold,
    });
    page.drawText("Qty", {
      x: 290,
      y: cursorY,
      size: 10,
      font: bold,
    });
    page.drawText("Unit", {
      x: 390,
      y: cursorY,
      size: 10,
      font: bold,
    });
    page.drawText("Total", {
      x: 475,
      y: cursorY,
      size: 10,
      font: bold,
    });

    cursorY -= 12;
    drawLine(page, cursorY);
    cursorY -= 18;

    for (const item of detail.sale.items) {
      page.drawText(item.productName, {
        x: 48,
        y: cursorY,
        size: 10,
        font: regular,
      });
      page.drawText(formatLiters(item.quantityInMl), {
        x: 290,
        y: cursorY,
        size: 10,
        font: regular,
      });
      page.drawText(formatCurrency(item.unitPriceInCents), {
        x: 390,
        y: cursorY,
        size: 10,
        font: regular,
      });
      page.drawText(formatCurrency(item.lineTotalInCents), {
        x: 475,
        y: cursorY,
        size: 10,
        font: regular,
      });
      cursorY -= 18;
    }

    cursorY -= 6;
    drawLine(page, cursorY);
    cursorY -= 22;

    page.drawText(`Amount paid: ${formatCurrency(detail.sale.amountPaidInCents)}`, {
      x: 330,
      y: cursorY,
      size: 11,
      font: regular,
    });
    cursorY -= 18;
    page.drawText(`Total: ${formatCurrency(detail.sale.totalInCents)}`, {
      x: 330,
      y: cursorY,
      size: 14,
      font: bold,
      color: rgb(0.04, 0.3, 0.47),
    });

    if (detail.sale.notes) {
      cursorY -= 32;
      page.drawText("Notes", {
        x: 48,
        y: cursorY,
        size: 12,
        font: bold,
      });
      cursorY -= 18;
      drawWrappedText({
        page,
        text: detail.sale.notes,
        x: 48,
        y: cursorY,
        maxWidth: 500,
        lineHeight: 14,
        font: regular,
        size: 10,
      });
    }
  }

  if (detail.lease) {
    page.drawText("Customer", {
      x: 48,
      y: cursorY,
      size: 12,
      font: bold,
    });
    cursorY -= 18;
    page.drawText(detail.lease.customerName, {
      x: 48,
      y: cursorY,
      size: 11,
      font: regular,
    });
    cursorY -= 14;
    page.drawText(detail.lease.phoneNumber, {
      x: 48,
      y: cursorY,
      size: 10,
      font: regular,
    });
    if (detail.lease.idNumber) {
      cursorY -= 14;
      page.drawText(`ID: ${detail.lease.idNumber}`, {
        x: 48,
        y: cursorY,
        size: 10,
        font: regular,
      });
    }

    cursorY -= 28;
    page.drawText("Lease summary", {
      x: 48,
      y: cursorY,
      size: 12,
      font: bold,
    });
    cursorY -= 18;

    const leaseLines = [
      `Machine: ${detail.lease.machineName}`,
      `Date out: ${formatDateTime(detail.lease.dateOut)}`,
      `Expected return: ${formatDateTime(detail.lease.expectedReturnDate)}`,
      detail.lease.actualReturnDate
        ? `Returned: ${formatDateTime(detail.lease.actualReturnDate)}`
        : "Returned: Pending",
      `Rate: ${formatCurrency(detail.lease.rateInCents)} per ${detail.lease.rateUnit}`,
      `Billable ${detail.lease.rateUnit === "day" ? "days" : "hours"}: ${detail.lease.billableUnits}`,
      `Total paid: ${formatCurrency(detail.lease.totalAmountInCents)}`,
    ];

    for (const line of leaseLines) {
      page.drawText(line, {
        x: 48,
        y: cursorY,
        size: 10,
        font: regular,
      });
      cursorY -= 16;
    }

    if (detail.lease.notes) {
      cursorY -= 10;
      page.drawText("Notes", {
        x: 48,
        y: cursorY,
        size: 12,
        font: bold,
      });
      cursorY -= 18;
      drawWrappedText({
        page,
        text: detail.lease.notes,
        x: 48,
        y: cursorY,
        maxWidth: 500,
        lineHeight: 14,
        font: regular,
        size: 10,
      });
    }
  }

  page.drawText("Thank you for choosing EzzClean.", {
    x: 48,
    y: 72,
    size: 11,
    font: bold,
    color: rgb(0.07, 0.24, 0.17),
  });
  page.drawText("This receipt was generated by the EzzClean POS system.", {
    x: 48,
    y: 56,
    size: 9,
    font: regular,
    color: rgb(0.32, 0.39, 0.45),
  });

  return pdfDoc.save();
}
