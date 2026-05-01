import { BASE_URL } from "../api/api";
import { getClientInvoiceUrl, getClientReceiptUrl } from "../api/clientApi";
import { getVehicleImageUrl as resolveVehicleImageFromFields, resolveImageUrl } from "./imageUrl";

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
  const value = String(url);
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/api/")) {
    return `${BASE_URL.replace(/\/api$/, "")}${value}`;
  }
  if (value.startsWith("/")) {
    return `${BASE_URL.replace(/\/api$/, "")}${value}`;
  }
  return value;
}

export function getBookingDocumentUrl(booking, type, pdf = false) {
  const bookingId = getBookingId(booking);

  if (type === "receipt") {
    const explicitUrl =
      booking?.receiptPdfUrl ||
      booking?.receiptUrl ||
      booking?.receipt?.pdfUrl ||
      booking?.receipt?.url ||
      booking?.documents?.receiptPdfUrl ||
      booking?.documents?.receiptUrl;

    if (explicitUrl) return normalizeDocumentUrl(explicitUrl);
    if (bookingId && booking?.receiptNumber) return getClientReceiptUrl(bookingId, pdf);
    return "";
  }

  const explicitUrl =
    booking?.invoicePdfUrl ||
    booking?.invoiceUrl ||
    booking?.invoice?.pdfUrl ||
    booking?.invoice?.url ||
    booking?.documents?.invoicePdfUrl ||
    booking?.documents?.invoiceUrl;

  if (explicitUrl) return normalizeDocumentUrl(explicitUrl);
  if (bookingId && (booking?.invoiceReference || booking?.invoiceNumber)) {
    return getClientInvoiceUrl(bookingId, pdf);
  }
  return "";
}

export function getVehicleImageUrl(booking) {
  return (
    resolveVehicleImageFromFields(booking) ||
    resolveImageUrl(booking?.vehicleImage) ||
    null
  );
}
