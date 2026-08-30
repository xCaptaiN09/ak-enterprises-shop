import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateInvoice = (sale, settings) => {
  const doc = new jsPDF();
  const invoiceNo = `INV-${sale.id.substring(0, 8).toUpperCase()}`;
  const date = sale.sale_date
    ? new Date(sale.sale_date).toLocaleDateString()
    : new Date().toLocaleDateString();

  // Premium Dark Header
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(settings.shop_name?.toUpperCase() || "BATTERY SHOP", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("TAX INVOICE", 196, 12, { align: "right" });
  doc.setTextColor(150, 150, 150);
  doc.text(`Invoice No: ${invoiceNo}`, 196, 20, { align: "right" });
  doc.text(`Date: ${date}`, 196, 26, { align: "right" });

  // Shop Details (Seller) — address, state + pin, phone + gstin, email
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.text(settings.shop_address || "", 14, 45);

  const stateLine = [
    settings.shop_state,
    settings.shop_pincode && `- ${settings.shop_pincode}`,
  ]
    .filter(Boolean)
    .join(" ");
  doc.text(stateLine || "", 14, 50);

  doc.text(
    `Phone: ${settings.shop_phone || "N/A"} | GSTIN: ${settings.shop_gstin || "N/A"}`,
    14,
    55,
  );
  doc.text(`Email: ${settings.shop_email || "N/A"}`, 14, 60);

  // Bill To (Buyer)
  doc.setDrawColor(230, 230, 230);
  doc.line(14, 70, 196, 70);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("BILL TO", 14, 77);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(sale.customer_name || "", 14, 84);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(sale.customer_address || "", 14, 90, { maxWidth: 110 });
  doc.text(`Phone: ${sale.phone || ""}`, 14, 100);
  doc.text(
    `GSTIN: ${sale.customer_gstin || "N/A"} | State: ${sale.customer_state || "N/A"}`,
    14,
    105,
  );

  // Calculations
  const mrp = sale.mrp || sale.price || 0;
  const discountVal = sale.discount || 0;
  const discountAmount =
    sale.discount_type === "percent" ? mrp * (discountVal / 100) : discountVal;
  const finalPrice = mrp - discountAmount;
  const taxableValue = finalPrice / 1.18;
  const cgst = taxableValue * 0.09;
  const sgst = taxableValue * 0.09;

  // Items Table (Monospace for numbers)
  autoTable(doc, {
    startY: 115,
    head: [["#", "Description of Goods", "HSN", "Rate", "Qty", "Amount"]],
    body: [
      [
        "1",
        `${sale.battery_brand} ${sale.battery_model}\nS/N: ${sale.serial_number || "N/A"}`,
        sale.hsn_code || "85071000",
        taxableValue.toFixed(2),
        "1",
        taxableValue.toFixed(2),
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: 50,
      fontStyle: "bold",
    },
    bodyStyles: { textColor: 50 },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      font: "courier",
      lineColor: [230, 230, 230],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "center" },
      5: { halign: "right" },
    },
  });

  let finalY = doc.lastAutoTable.finalY;

  // Summary Box (Right aligned, Monospace)
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  let summaryY = finalY + 10;
  const summaryX = 140;

  doc.setTextColor(100, 100, 100);
  doc.text("MRP:", summaryX, summaryY);
  doc.text(`Rs. ${mrp.toFixed(2)}`, 196, summaryY, { align: "right" });

  if (discountAmount > 0) {
    summaryY += 6;
    doc.setTextColor(200, 50, 50);
    const discountLabel =
      sale.discount_type === "percent"
        ? `Discount (${discountVal}%):`
        : "Discount:";
    doc.text(discountLabel, summaryX, summaryY);
    doc.text(`- Rs. ${discountAmount.toFixed(2)}`, 196, summaryY, {
      align: "right",
    });
  }

  summaryY += 6;
  doc.setTextColor(100, 100, 100);
  doc.text("Taxable Value:", summaryX, summaryY);
  doc.text(`Rs. ${taxableValue.toFixed(2)}`, 196, summaryY, { align: "right" });

  summaryY += 6;
  doc.text("CGST (9%):", summaryX, summaryY);
  doc.text(`Rs. ${cgst.toFixed(2)}`, 196, summaryY, { align: "right" });

  summaryY += 6;
  doc.text("SGST (9%):", summaryX, summaryY);
  doc.text(`Rs. ${sgst.toFixed(2)}`, 196, summaryY, { align: "right" });

  summaryY += 8;
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.5);
  doc.line(summaryX, summaryY, 196, summaryY);

  summaryY += 6;
  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("GRAND TOTAL:", summaryX, summaryY);
  doc.text(`Rs. ${finalPrice.toFixed(2)}`, 196, summaryY, { align: "right" });

  // Amount in words (Left aligned, Helvetica)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Amount Chargeable (in words):", 14, summaryY);
  doc.text("INR " + numberToWords(finalPrice) + " Only", 14, summaryY + 6);

  // Footer
  doc.setDrawColor(230, 230, 230);
  doc.line(14, 270, 196, 270);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Declaration: We declare that this invoice shows the actual price of the",
    14,
    276,
  );
  doc.text(
    "goods described and that all particulars are true and correct.",
    14,
    280,
  );

  doc.setFont("helvetica", "bold");
  doc.text("for " + (settings.shop_name || "Battery Shop"), 150, 285);
  doc.setFont("helvetica", "normal");
  doc.text("Authorised Signatory", 150, 290);

  doc.save(`Invoice_${sale.customer_name || "Customer"}.pdf`);
};

function numberToWords(num) {
  if (num === 0) return "Zero";
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " : "") + a[n % 10];
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " : "") +
        inWords(n % 100)
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " : "") +
        inWords(n % 1000)
      );
    return (
      inWords(Math.floor(n / 100000)) +
      " Lakh" +
      (n % 100000 ? " " : "") +
      inWords(n % 100000)
    );
  };
  let rupees = Math.floor(num);
  let paise = Math.round((num - rupees) * 100);
  let words = inWords(rupees);
  if (paise > 0) words += " and " + inWords(paise) + " Paise";
  return words;
}
