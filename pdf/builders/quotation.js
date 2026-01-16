import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

// 1. Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateQuotationPDF = (order, cook) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers = [];

      // 2. Define Font Paths
      const regularFontPath = path.join(
        __dirname,
        "../../fonts/Roboto-Regular.ttf"
      );
      const boldFontPath = path.join(__dirname, "../../fonts/Roboto-Bold.ttf");

      // 3. Register Fonts
      doc.registerFont("Roboto", regularFontPath);
      doc.registerFont("Roboto-Bold", boldFontPath);

      doc.font("Roboto");

      // 4. Data Collection
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // 5. Generate Content
      generateHeader(doc, cook);
      generateOrderInfo(doc, order);

      // We capture the returned Y position to know where to start the summary
      const tableEndY = generateInvoiceTable(doc, order);

      generateSummary(doc, order, tableEndY);
      generateFooter(doc);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// --- HELPER FUNCTIONS ---

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDate = (date) => {
  return date
    ? new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "N/A";
};

function generateHeader(doc, cook) {
  doc
    .fillColor("#444444")
    .fontSize(20)
    .font("Roboto-Bold")
    .text(cook.businessName || cook.name, 50, 57)
    .font("Roboto")
    .fontSize(10)
    .text(cook.name, 50, 80)
    .text(cook.address || "Address Not Available", 50, 95)
    .text(`${cook.email} | ${cook.phone}`, 50, 110)
    .moveDown();

  doc
    .strokeColor("#fc8019")
    .lineWidth(2)
    .moveTo(50, 135)
    .lineTo(550, 135)
    .stroke();
}

function generateOrderInfo(doc, order) {
  doc
    .fillColor("#444444")
    .fontSize(18)
    .font("Roboto-Bold")
    .text("QUOTATION", 50, 160);
  generateHr(doc, 185);

  const top = 200;
  doc.fontSize(10).font("Roboto");

  // Left Side
  doc
    .text("Order No:", 50, top)
    .font("Roboto-Bold")
    .text(order.orderNo || "DRAFT", 120, top);
  doc
    .font("Roboto")
    .text("Order Date:", 50, top + 15)
    .text(formatDate(order.createdAt), 120, top + 15);
  doc
    .text("Event Date:", 50, top + 30)
    .text(formatDate(order.eventDate), 120, top + 30);

  // Right Side (Client)
  doc.font("Roboto-Bold").text("CLIENT DETAILS:", 350, top);
  doc.font("Roboto").text(order.clientName, 350, top + 15);
  doc.text(order.clientPhone || "No Phone Provided", 350, top + 30);
  doc.text(`Status: ${order.status.replace("_", " ")}`, 350, top + 45);

  generateHr(doc, 265);
}

function generateInvoiceTable(doc, order) {
  let currentY = 300;

  // Header
  doc.font("Roboto-Bold");
  generateTableRow(
    doc,
    currentY,
    "Item Description",
    "Unit",
    "Qty",
    "Price",
    "Total"
  );
  generateHr(doc, currentY + 15);
  doc.font("Roboto");
  currentY += 25;

  // 1. Render COMBOS First
  if (order.combos && order.combos.length > 0) {
    doc.font("Roboto-Bold").fillColor("#fc8019").text("COMBOS", 50, currentY);
    doc.fillColor("#444444").font("Roboto");
    currentY += 20;

    order.combos.forEach((combo) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      // Main Combo Row
      generateTableRow(
        doc,
        currentY,
        `Combo: ${combo.nameSnapshot}`,
        "pkg",
        combo.qty,
        formatCurrency(combo.pricePerUnitSnapshot),
        formatCurrency(combo.itemSubtotal)
      );

      // --- "INCLUDES" MOVED TO THE VERY LEFT ---
      if (combo.dishesSnapshot && combo.dishesSnapshot.length > 0) {
        currentY += 15; // Small vertical gap after the combo name

        const dishList = combo.dishesSnapshot
          .map((d) => `${d.quantity}x ${d.name}`)
          .join(", ");

        const includesText = `Includes: ${dishList}`;
        // Width 220 ensures it stays within the "Item Description" column
        const textOptions = { width: 220, align: "left" };

        const textHeight = doc.heightOfString(includesText, textOptions);

        doc
          .fontSize(8)
          .fillColor("#777777")
          .text(includesText, 50, currentY, textOptions); // X set to 50 (Very Left)

        doc.fontSize(10).fillColor("#444444");
        currentY += textHeight;
      }

      generateHr(doc, currentY + 10);
      currentY += 25;
    });
  }

  // 2. Render INDIVIDUAL ITEMS
  if (order.items && order.items.length > 0) {
    currentY += 10;
    doc
      .font("Roboto-Bold")
      .fillColor("#fc8019")
      .text("INDIVIDUAL DISHES", 50, currentY);
    doc.fillColor("#444444").font("Roboto");
    currentY += 20;

    order.items.forEach((item) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      generateTableRow(
        doc,
        currentY,
        item.nameSnapshot,
        item.unit,
        item.qty,
        formatCurrency(item.pricePerUnitSnapshot),
        formatCurrency(item.itemSubtotal)
      );

      generateHr(doc, currentY + 15);
      currentY += 25;
    });
  }

  return currentY;
}

function generateSummary(doc, order, y) {
  let currentY = y + 20;

  // Helper to draw right-aligned summary rows
  const drawSummaryRow = (label, value, isBold = false, color = "#444444") => {
    if (currentY > 750) {
      doc.addPage();
      currentY = 50;
    }
    doc
      .font(isBold ? "Roboto-Bold" : "Roboto")
      .fillColor(color)
      .text(label, 350, currentY, { width: 100, align: "right" })
      .text(value, 450, currentY, { width: 100, align: "right" });
    currentY += 20;
  };

  drawSummaryRow("Subtotal:", formatCurrency(order.subtotal));

  if (order.additionalCharges > 0) {
    drawSummaryRow("Addl. Charges:", formatCurrency(order.additionalCharges));
  }

  if (order.orderDiscount && order.orderDiscount.amount > 0) {
    const isPercent = order.orderDiscount.type === "percent";
    const discountLabel = isPercent
      ? `Discount (${order.orderDiscount.amount}%):`
      : "Discount:";

    // Calculate display value
    const discountVal = isPercent
      ? (order.subtotal * order.orderDiscount.amount) / 100
      : order.orderDiscount.amount;

    drawSummaryRow(
      discountLabel,
      `- ${formatCurrency(discountVal)}`,
      false,
      "#e53e3e"
    );
  }

  doc.text("", 350, currentY); // Spacer
  currentY += 5;
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(350, currentY)
    .lineTo(550, currentY)
    .stroke();
  currentY += 10;

  drawSummaryRow("GRAND TOTAL:", formatCurrency(order.total), true, "#fc8019");

  // Notes section if exists
  if (order.notes) {
    currentY += 30;
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
    }
    doc.font("Roboto-Bold").fillColor("#444444").text("Notes:", 50, currentY);
    doc
      .font("Roboto")
      .fontSize(9)
      .text(order.notes, 50, currentY + 15, { width: 500 });
  }
}

function generateFooter(doc) {
  doc
    .fontSize(10)
    .fillColor("#aaaaaa")
    .text("This is a computer generated quotation.", 50, 780, {
      align: "center",
      width: 500,
    });
}

function generateTableRow(doc, y, item, unit, qty, price, total) {
  doc
    .fontSize(10)
    .text(item, 50, y, { width: 220 })
    .text(unit, 280, y, { width: 50, align: "right" })
    .text(qty, 350, y, { width: 40, align: "center" })
    .text(price, 400, y, { width: 70, align: "right" })
    .text(total, 490, y, { width: 60, align: "right" });
}

function generateHr(doc, y) {
  doc.strokeColor("#eeeeee").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}
