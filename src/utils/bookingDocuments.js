import { getClientInvoiceUrl, getClientReceiptUrl } from "../api/clientApi";
import { getVehicleImageUrl as resolveVehicleImageFromFields, resolveImageUrl } from "./imageUrl";
import { resolvePdfUrl } from "./pdfUtils";

export function getBookingId(booking) {
  return booking?._id || booking?.id || "";
}

export function getReferenceNo(booking) {
  if (booking?.bookingReference) return booking.bookingReference;
  if (booking?.bookingCode) return booking.bookingCode;
  if (booking?.referenceNo) return booking.referenceNo;
  if (booking?._id) return `DR-${booking._id.slice(-6).toUpperCase()}`;
  return "Booking";
}

export function getVehicleName(booking) {
  if (booking?.vehicleId?.make && booking?.vehicleId?.model) {
    return `${booking.vehicleId.make} ${booking.vehicleId.model}`;
  }
  return booking?.vehicleName || "Vehicle";
}

export function formatBookingDate(date) {
  if (!date) return "N/A";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "N/A";
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatBookingDateTime(date) {
  if (!date) return "Not set";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Not set";
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatBookingPrice(value) {
  return `PHP ${Number(value || 0).toLocaleString()}`;
}

export function normalizeDocumentUrl(url) {
  if (!url) return "";
  return resolvePdfUrl(url);
}

function getDocumentSourceValue(...values) {
  const source = values.find((value) => value !== undefined && value !== null && value !== "");
  if (!source) return "";

  if (typeof source === "object") {
    return getDocumentSourceValue(
      source.pdfUrl,
      source.url,
      source.documentUrl,
      source.fileUrl,
      source.pdfPath,
      source.path,
      source.filename,
      source.fileName,
      source.name
    );
  }

  return String(source).trim();
}

export function getReceiptPdfSource(booking, pdf = false) {
  const bookingId = getBookingId(booking);
  const explicitSource = getDocumentSourceValue(
    booking?.receiptPdfUrl,
    booking?.receiptUrl,
    booking?.receiptDocumentUrl,
    booking?.receiptFileUrl,
    booking?.receiptPdfPath,
    booking?.receipt?.pdfUrl,
    booking?.receipt?.url,
    booking?.receipt?.documentUrl,
    booking?.receipt?.fileUrl,
    booking?.receipt?.pdfPath,
    booking?.receipt?.filename,
    booking?.documents?.receiptPdfUrl,
    booking?.documents?.receiptUrl,
    booking?.documents?.receiptDocumentUrl,
    booking?.documents?.receiptFileUrl,
    booking?.documents?.receiptPdfPath,
    booking?.documents?.receiptFilename
  );

  if (explicitSource && !/^[-\w]+\.pdf$/i.test(explicitSource)) {
    return normalizeDocumentUrl(explicitSource);
  }

  if (bookingId && booking?.receiptNumber) {
    return getClientReceiptUrl(bookingId, pdf);
  }

  return explicitSource ? normalizeDocumentUrl(explicitSource) : "";
}

export function getInvoicePdfSource(booking, pdf = false) {
  const bookingId = getBookingId(booking);
  const explicitSource = getDocumentSourceValue(
    booking?.invoicePdfUrl,
    booking?.invoiceUrl,
    booking?.invoiceDocumentUrl,
    booking?.invoiceFileUrl,
    booking?.invoicePdfPath,
    booking?.invoice?.pdfUrl,
    booking?.invoice?.url,
    booking?.invoice?.documentUrl,
    booking?.invoice?.fileUrl,
    booking?.invoice?.pdfPath,
    booking?.invoice?.filename,
    booking?.documents?.invoicePdfUrl,
    booking?.documents?.invoiceUrl,
    booking?.documents?.invoiceDocumentUrl,
    booking?.documents?.invoiceFileUrl,
    booking?.documents?.invoicePdfPath,
    booking?.documents?.invoiceFilename
  );

  if (explicitSource && !/^[-\w]+\.pdf$/i.test(explicitSource)) {
    return normalizeDocumentUrl(explicitSource);
  }

  if (bookingId && (booking?.invoiceReference || booking?.invoiceNumber)) {
    return getClientInvoiceUrl(bookingId, pdf);
  }

  return explicitSource ? normalizeDocumentUrl(explicitSource) : "";
}

export function getBookingDocumentUrl(booking, type, pdf = false) {
  if (type === "receipt") {
    return getReceiptPdfSource(booking, pdf);
  }

  return getInvoicePdfSource(booking, pdf);
}

export function getVehicleImageUrl(booking) {
  return (
    resolveVehicleImageFromFields(booking) ||
    resolveImageUrl(booking?.vehicleImage) ||
    null
  );
}
