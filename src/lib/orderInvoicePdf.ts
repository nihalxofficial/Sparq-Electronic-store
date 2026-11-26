import type { CustomerOrder } from "@/types/customerDashboard";

/**
 * Builds a multi-page PDF invoice for a customer order using jsPDF.
 *
 * The library is imported dynamically on click so it never bloats the page bundle.
 * Handles long product names, long addresses, multiple items, and multi-page
 * pagination with repeated table headers and consistent footers.
 */

const TEXT: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [226, 232, 240];
const HEAD_FILL: [number, number, number] = [243, 244, 246];
const ACCENT: [number, number, number] = [2, 132, 199];

interface InvoiceOptions {
  siteName: string;
  formatMoney: (amount: number) => string;
}

function safeFilePart(text: string): string {
  return text.replace(/[^a-z0-9._-]+/gi, "-");
}

function shippingLabel(method?: CustomerOrder["shippingMethod"]): string {
  switch (method) {
    case "free":
      return "Free Shipping";
    case "express":
      return "Express Delivery";
    default:
      return "Standard Delivery";
  }
}

export async function downloadOrderInvoicePdf(
  order: CustomerOrder,
  options: InvoiceOptions
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const money = options.formatMoney;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 44;
  const right = pageWidth - 44;
  const contentWidth = right - left;
  const bottom = pageHeight - 64;

  let y = 56;

  const drawContinuationHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`${options.siteName} — Invoice ${order.orderNumber} (continued)`, left, 36);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.line(left, 44, right, 44);
  };

  /** Starts a new page when the next block will not fit above the footer. */
  const ensureSpace = (needed: number, onNewPage?: () => void) => {
    if (y + needed <= bottom) return false;
    doc.addPage();
    drawContinuationHeader();
    y = 64;
    onNewPage?.();
    return true;
  };

  const sectionTitle = (text: string) => {
    ensureSpace(44);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(text.toUpperCase(), left, y);
    y += 7;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.8);
    doc.line(left, y, right, y);
    y += 16;
  };

  // ── Page 1 Header ─────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...TEXT);
  doc.text(options.siteName, left, y);

  doc.setFontSize(14);
  doc.setTextColor(...ACCENT);
  doc.text("ORDER INVOICE", right, y, { align: "right" });

  y += 12;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(1.2);
  doc.line(left, y, right, y);

  // ── Order Metadata Grid (2 clean rows, 3 columns max, wrapped) ──────────
  y += 22;
  const metaCol1 = left;
  const metaCol2 = left + 185;
  const metaCol3 = right;

  const drawMetaCell = (
    label: string,
    val: string,
    x: number,
    yPos: number,
    maxWidth: number,
    align: "left" | "right" = "left"
  ) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, yPos, { align });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(val || "—", maxWidth);
    doc.text(lines, x, yPos + 13, { align });
    return lines.length * 12;
  };

  const row1H = Math.max(
    drawMetaCell("Order Number", order.orderNumber, metaCol1, y, 170),
    drawMetaCell("Order Date", order.date, metaCol2, y, 170),
    drawMetaCell("Order Status", order.status, metaCol3, y, 140, "right")
  );
  y += row1H + 22;

  const paymentLabel = `${order.paymentMethod}${order.paymentStatus ? ` · ${order.paymentStatus}` : ""}`;
  const row2H = Math.max(
    drawMetaCell("Payment", paymentLabel, metaCol1, y, 220),
    order.trackingNumber
      ? drawMetaCell("Tracking Number", order.trackingNumber, metaCol3, y, 220, "right")
      : 12
  );
  y += row2H + 26;

  // ── Customer & Delivery Details (Two-column layout with dynamic height) ───
  sectionTitle("Customer & Delivery Details");

  const colLeftW = 245;
  const colRightX = left + 270;
  const colRightW = right - colRightX;

  let leftY = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("CUSTOMER & SHIPPING ADDRESS", left, leftY);
  leftY += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  if (order.customerName) {
    const nameLines = doc.splitTextToSize(order.customerName, colLeftW);
    doc.text(nameLines, left, leftY);
    leftY += nameLines.length * 13;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  if (order.customerPhone) {
    doc.text(`Phone: ${order.customerPhone}`, left, leftY);
    leftY += 13;
  }
  if (order.customerEmail) {
    const emailLines = doc.splitTextToSize(`Email: ${order.customerEmail}`, colLeftW);
    doc.text(emailLines, left, leftY);
    leftY += emailLines.length * 13;
  }

  const addressLines = doc.splitTextToSize(
    order.shippingAddress || "Not provided",
    colLeftW
  );
  doc.text(addressLines, left, leftY);
  leftY += addressLines.length * 13;

  let rightY = y;
  const drawDeliveryRow = (label: string, val: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(label, colRightX, rightY);
    rightY += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(val || "—", colRightW);
    doc.text(lines, colRightX, rightY);
    rightY += lines.length * 12 + 8;
  };

  drawDeliveryRow("Delivery Method", shippingLabel(order.shippingMethod));
  drawDeliveryRow("Estimated Delivery", order.estimatedDelivery || "—");
  if (order.carrier) {
    drawDeliveryRow("Carrier", order.carrier);
  }
  if (order.riderName) {
    const riderInfo = order.riderPhone
      ? `${order.riderName} (${order.riderPhone})`
      : order.riderName;
    drawDeliveryRow("Assigned Rider", riderInfo);
  }

  y = Math.max(leftY, rightY) + 20;

  // ── Order Items Table ─────────────────────────────────────────────────────
  sectionTitle("Order Items");

  const colItemX = left + 8;
  const colQtyX = left + 275;
  const colUnitX = left + 355;
  const colDiscX = left + 425;
  const colTotalX = right - 8;
  const itemTextWidth = colQtyX - colItemX - 24;

  const tableHeader = () => {
    ensureSpace(32);
    doc.setFillColor(...HEAD_FILL);
    doc.rect(left, y - 12, contentWidth, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("ITEM", colItemX, y + 2);
    doc.text("QTY", colQtyX, y + 2, { align: "right" });
    doc.text("UNIT PRICE", colUnitX, y + 2, { align: "right" });
    doc.text("DISCOUNT", colDiscX, y + 2, { align: "right" });
    doc.text("LINE TOTAL", colTotalX, y + 2, { align: "right" });
    y += 22;
  };

  tableHeader();

  let computedSubtotal = 0;

  order.items.forEach((item) => {
    const unitPrice = Number(item.price) || 0;
    const origPrice = Number(item.originalPrice) || unitPrice;
    const qty = Number(item.quantity) || 1;
    const itemDiscount = origPrice > unitPrice ? (origPrice - unitPrice) * qty : 0;
    const lineTotal = unitPrice * qty;
    computedSubtotal += lineTotal;

    const nameLines = doc.splitTextToSize(item.name || "Product", itemTextWidth);
    const hasOriginal = origPrice > unitPrice;
    const rowTextHeight = nameLines.length * 12 + (hasOriginal ? 11 : 0);
    const rowHeight = Math.max(24, rowTextHeight + 10);

    ensureSpace(rowHeight + 6, tableHeader);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    doc.text(nameLines, colItemX, y + 2);

    if (hasOriginal) {
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(`Original: ${money(origPrice)}`, colItemX, y + 2 + nameLines.length * 12);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    doc.text(String(qty), colQtyX, y + 2, { align: "right" });
    doc.text(money(unitPrice), colUnitX, y + 2, { align: "right" });
    doc.text(itemDiscount > 0 ? `-${money(itemDiscount)}` : "—", colDiscX, y + 2, {
      align: "right",
    });
    doc.setFont("helvetica", "bold");
    doc.text(money(lineTotal), colTotalX, y + 2, { align: "right" });

    y += rowHeight;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(left, y - 5, right, y - 5);
  });

  // ── Financial Summary / Totals ────────────────────────────────────────────
  const subtotal = order.subtotal ?? computedSubtotal;
  const shippingFee = order.shippingFee ?? 0;
  const couponDisc = order.couponDiscount ?? 0;
  const pointsDisc = order.pointsDiscount ?? 0;

  const summaryRows: { label: string; value: string; bold?: boolean }[] = [
    { label: `Subtotal (${order.itemCount} item${order.itemCount === 1 ? "" : "s"})`, value: money(subtotal) },
    {
      label: `Shipping (${shippingLabel(order.shippingMethod)})`,
      value: shippingFee > 0 ? money(shippingFee) : "Free",
    },
  ];

  if (couponDisc > 0) {
    summaryRows.push({
      label: `Coupon Discount${order.couponCode ? ` (${order.couponCode})` : ""}`,
      value: `-${money(couponDisc)}`,
    });
  }
  if (pointsDisc > 0) {
    summaryRows.push({
      label: `Reward Points (${order.pointsRedeemed ?? 0} pts)`,
      value: `-${money(pointsDisc)}`,
    });
  }

  ensureSpace(summaryRows.length * 18 + 44);
  y += 10;

  const summaryLabelX = right - 125;
  summaryRows.forEach((row) => {
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(row.label, summaryLabelX, y, { align: "right" });

    doc.setTextColor(...TEXT);
    doc.text(row.value, right - 8, y, { align: "right" });
    y += 18;
  });

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.8);
  doc.line(left + 280, y - 6, right, y - 6);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT);
  doc.text("TOTAL PAID", summaryLabelX, y, { align: "right" });
  doc.setFontSize(14);
  doc.text(money(order.total), right - 8, y, { align: "right" });
  y += 32;

  // ── Order Timeline ────────────────────────────────────────────────────────
  const steps = (order.timeline || []).filter((step) => step.completed || step.date);
  if (steps.length > 0) {
    sectionTitle("Order Timeline");

    steps.forEach((step) => {
      const descLines = step.description
        ? doc.splitTextToSize(step.description, contentWidth - 10)
        : [];
      const blockHeight = 16 + descLines.length * 12 + 8;
      ensureSpace(blockHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...TEXT);
      doc.text(step.title, left, y);

      if (step.date) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        doc.text(step.date, right, y, { align: "right" });
      }

      if (descLines.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        doc.text(descLines, left, y + 13);
      }

      y += blockHeight;
    });
  }

  // ── Customer Response ─────────────────────────────────────────────────────
  if (order.customerResponse) {
    const noteLines = order.customerResponseNote
      ? doc.splitTextToSize(order.customerResponseNote, contentWidth)
      : [];
    ensureSpace(50 + noteLines.length * 12);
    y += 4;
    sectionTitle("Your Response");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text(`Reported: ${order.customerResponse.replace(/_/g, " ")}`, left, y);
    y += 15;

    if (noteLines.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(noteLines, left, y);
      y += noteLines.length * 12 + 8;
    }
  }

  // ── Consistent Footer on Every Page ───────────────────────────────────────
  const generatedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const totalPages = doc.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.line(left, pageHeight - 48, right, pageHeight - 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `${options.siteName} · Invoice ${order.orderNumber} · Generated ${generatedAt}`,
      left,
      pageHeight - 33
    );
    doc.text(`Page ${p} of ${totalPages}`, right, pageHeight - 33, { align: "right" });
  }

  const fileName = `${safeFilePart(options.siteName)}-invoice-${safeFilePart(order.orderNumber)}.pdf`;
  doc.save(fileName);
}
