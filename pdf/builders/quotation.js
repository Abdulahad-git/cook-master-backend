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

      // 2. Define Font Paths (Adjust '../fonts' if your folder structure differs)
      const regularFontPath = path.join(
        __dirname,
        "../../fonts/Roboto-Regular.ttf"
      );
      const boldFontPath = path.join(__dirname, "../../fonts/Roboto-Bold.ttf");

      // 3. Register Fonts
      // We register them as 'Roboto' and 'Roboto-Bold' to reference them later
      doc.registerFont("Roboto", regularFontPath);
      doc.registerFont("Roboto-Bold", boldFontPath);

      // 4. Set Initial Font
      doc.font("Roboto");

      // 5. Data Collection
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // 6. Generate Content
      generateHeader(doc, cook);
      generateOrderInfo(doc, order);
      generateInvoiceTable(doc, order);
      generateFooter(doc);

      // 7. Finalize
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
    .font("Roboto-Bold") // Use Bold for Title
    .text(cook.businessName || cook.name, 50, 57)
    .font("Roboto") // Switch back to Regular
    .fontSize(10)
    .text(cook.name, 50, 80)
    .text(cook.address || "Address Not Available", 50, 95)
    .text(`${cook.email} | ${cook.phone}`, 50, 110)
    .moveDown();

  // Orange Divider
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
    .fontSize(20)
    .font("Roboto-Bold")
    .text("QUOTATION", 50, 160);

  generateHr(doc, 185);

  const customerInformationTop = 200;

  doc
    .fontSize(10)
    .font("Roboto") // Ensure Regular font starts here
    .text("Order No:", 50, customerInformationTop)
    .font("Roboto-Bold") // CHANGED from Helvetica-Bold
    .text(order.orderNo || "PENDING", 150, customerInformationTop)
    .font("Roboto") // CHANGED from Helvetica
    .text("Order Date:", 50, customerInformationTop + 15)
    .text(formatDate(order.createdAt), 150, customerInformationTop + 15)
    .text("Event Date:", 50, customerInformationTop + 30)
    .text(formatDate(order.eventDate), 150, customerInformationTop + 30)
    .text("Status:", 50, customerInformationTop + 45)
    .text(order.status.replace("_", " "), 150, customerInformationTop + 45)

    .font("Roboto-Bold") // CHANGED from Helvetica-Bold
    .text(order.clientName, 300, customerInformationTop)
    .font("Roboto") // CHANGED from Helvetica
    .text(order.clientPhone || "", 300, customerInformationTop + 15)
    .moveDown();

  generateHr(doc, 265);
}

function generateInvoiceTable(doc, order) {
  let i;
  const invoiceTableTop = 330;

  doc.font("Roboto-Bold"); // CHANGED from Helvetica-Bold
  generateTableRow(
    doc,
    invoiceTableTop,
    "Item",
    "Unit",
    "Qty",
    "Price",
    "Total"
  );
  generateHr(doc, invoiceTableTop + 20);
  doc.font("Roboto"); // CHANGED from Helvetica

  let position = 0;

  // -- ITEMS LOOP --
  for (i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    position = invoiceTableTop + (i + 1) * 30;

    // Check for page break
    if (position > 700) {
      doc.addPage();
      doc.font("Roboto"); // Reset font after new page
      position = 50;
    }

    generateTableRow(
      doc,
      position,
      item.nameSnapshot,
      item.unit,
      item.qty,
      formatCurrency(item.pricePerUnitSnapshot),
      formatCurrency(item.itemSubtotal)
    );

    generateHr(doc, position + 20);
  }

  // -- TOTALS SECTION --
  const subtotalPosition = position + 40;

  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "Subtotal",
    "",
    formatCurrency(order.subtotal)
  );

  let currentPos = subtotalPosition + 20;

  if (order.additionalCharges > 0) {
    generateTableRow(
      doc,
      currentPos,
      "",
      "",
      "Add. Charges",
      "",
      formatCurrency(order.additionalCharges)
    );
    currentPos += 20;
  }

  if (order.orderDiscount && order.orderDiscount.amount > 0) {
    const isPercent = order.orderDiscount.type === "percent";
    const discountLabel = isPercent
      ? `Discount (${order.orderDiscount.amount}%)`
      : "Discount";

    const discountVal = isPercent
      ? (order.subtotal * order.orderDiscount.amount) / 100
      : order.orderDiscount.amount;

    doc.fillColor("#e53e3e");
    generateTableRow(
      doc,
      currentPos,
      "",
      "",
      discountLabel,
      "",
      `-${formatCurrency(discountVal)}`
    );
    doc.fillColor("#444444");
    currentPos += 20;
  }

  doc.font("Roboto-Bold"); // CHANGED from Helvetica-Bold
  generateTableRow(
    doc,
    currentPos + 5,
    "",
    "",
    "TOTAL",
    "",
    formatCurrency(order.total)
  );
  doc.font("Roboto"); // CHANGED from Helvetica
}

function generateFooter(doc) {
  doc.fontSize(10).text("Thank you for your business.", 50, 750, {
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
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}
