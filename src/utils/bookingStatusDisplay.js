import { getContractAcceptanceState } from "./bookingContractDisplay";

export const BOOKING_STATUS_FILTERS = [
  { key: "all", label: "All", tone: "all" },
  { key: "in_progress", label: "In Progress", tone: "progress" },
  { key: "awaiting_payment", label: "Awaiting Payment", tone: "payment" },
  { key: "under_review", label: "Under Review", tone: "review" },
  { key: "confirmed", label: "Confirmed", tone: "confirmed" },
  { key: "completed", label: "Completed", tone: "completed" },
  { key: "cancelled", label: "Cancelled", tone: "cancelled" },
  { key: "rejected", label: "Rejected", tone: "cancelled" },
  { key: "expired", label: "Expired", tone: "cancelled" },
  { key: "archived", label: "Archived", tone: "cancelled" },
  { key: "closed", label: "Closed", tone: "cancelled" },
];

export const BOOKING_VIEW_TABS = [
  { key: "active", label: "Active" },
  { key: "history", label: "History" },
];

const BOOKING_STATUS_GROUPS = {
  in_progress: {
    label: "In Progress",
    tone: "progress",
    nextAction: "Finish your booking.",
  },
  awaiting_payment: {
    label: "Awaiting Payment",
    tone: "payment",
    nextAction: "Review your invoice and complete payment.",
  },
  under_review: {
    label: "Under Review",
    tone: "review",
    nextAction: "Your payment proof is being reviewed.",
  },
  confirmed: {
    label: "Confirmed",
    tone: "confirmed",
    nextAction: "Your booking is secured.",
  },
  completed: {
    label: "Completed",
    tone: "completed",
    nextAction: "Trip completed.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "cancelled",
    nextAction: "Booking closed.",
  },
  rejected: {
    label: "Rejected",
    tone: "cancelled",
    nextAction: "Booking closed.",
  },
  expired: {
    label: "Expired",
    tone: "cancelled",
    nextAction: "Booking expired.",
  },
  archived: {
    label: "Archived",
    tone: "cancelled",
    nextAction: "Booking archived.",
  },
  closed: {
    label: "Closed",
    tone: "cancelled",
    nextAction: "Booking closed.",
  },
  processing: {
    label: "Processing",
    tone: "review",
    nextAction: "We are updating your booking.",
  },
};

export const ACTIVE_BOOKING_STATUS_KEYS = [
  "in_progress",
  "awaiting_payment",
  "under_review",
  "confirmed",
  "processing",
];

export const HISTORY_BOOKING_STATUS_KEYS = [
  "completed",
  "cancelled",
  "rejected",
  "expired",
  "archived",
  "closed",
];

const warnedUnknownStatuses = new Set();

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function collectSignals(bookingOrStatus) {
  if (!isObject(bookingOrStatus)) {
    const status = normalizeLower(bookingOrStatus);
    return {
      booking: null,
      status,
      bookingStatus: "",
      paymentStatus: "",
      invoiceStatus: "",
      contractStatus: "",
      allValues: [status].filter(Boolean),
    };
  }

  const booking = bookingOrStatus;
  const status = normalizeLower(booking?.status);
  const bookingStatus = normalizeLower(booking?.bookingStatus);
  const paymentStatus = normalizeLower(booking?.paymentStatus);
  const invoiceStatus = normalizeLower(booking?.invoiceStatus);
  const contractStatus = normalizeLower(booking?.contractStatus);

  return {
    booking,
    status,
    bookingStatus,
    paymentStatus,
    invoiceStatus,
    contractStatus,
    allValues: [status, bookingStatus, paymentStatus, invoiceStatus, contractStatus].filter(Boolean),
  };
}

function includesAny(values, candidates) {
  return values.some((value) => candidates.includes(value));
}

function hasContractPending(booking) {
  if (!isObject(booking)) return false;

  const contractState = getContractAcceptanceState(booking);
  return Boolean(contractState.requiresContract && !contractState.contractAccepted);
}

function warnUnknownStatus(signals) {
  const warningKey = JSON.stringify({
    status: signals.status,
    bookingStatus: signals.bookingStatus,
    paymentStatus: signals.paymentStatus,
    invoiceStatus: signals.invoiceStatus,
    contractStatus: signals.contractStatus,
  });

  if (warnedUnknownStatuses.has(warningKey)) return;
  warnedUnknownStatuses.add(warningKey);

  console.warn("[BookingStatus][unknown]", {
    status: signals.status,
    bookingStatus: signals.bookingStatus,
    paymentStatus: signals.paymentStatus,
    invoiceStatus: signals.invoiceStatus,
    contractStatus: signals.contractStatus,
  });
}

function resolveStatusKey(bookingOrStatus) {
  const signals = collectSignals(bookingOrStatus);
  const statusValues = signals.allValues;

  if (
    includesAny(statusValues, [
      "completed",
      "trip_completed",
      "done",
    ])
  ) {
    return "completed";
  }

  if (
    includesAny(statusValues, [
      "rejected",
      "declined",
      "denied",
    ])
  ) {
    return "rejected";
  }

  if (
    includesAny(statusValues, [
      "expired",
    ])
  ) {
    return "expired";
  }

  if (
    includesAny(statusValues, [
      "archived",
    ])
  ) {
    return "archived";
  }

  if (
    includesAny(statusValues, [
      "closed",
    ])
  ) {
    return "closed";
  }

  if (
    includesAny(statusValues, [
      "cancelled",
      "canceled",
      "cancelled_conflict",
    ])
  ) {
    return "cancelled";
  }

  if (
    includesAny([signals.paymentStatus], [
      "payment_verified",
      "verified",
      "fully_paid",
      "downpayment_paid",
    ]) ||
    includesAny([signals.status, signals.bookingStatus], [
      "confirmed",
      "booked_confirmed",
      "payment_verified",
    ])
  ) {
    return "confirmed";
  }

  if (
    includesAny([signals.paymentStatus], [
      "under_review",
      "payment_submitted",
      "submitted",
      "proof_uploaded",
      "pending_review",
      "pending",
    ]) ||
    includesAny([signals.status, signals.bookingStatus], [
      "under_review",
      "pending_approval",
      "pending_review",
      "proof_uploaded",
    ])
  ) {
    return "under_review";
  }

  if (
    includesAny([signals.status, signals.bookingStatus], [
      "approved",
      "awaiting_payment",
      "pending_payment",
      "invoice_issued",
      "payment_rejected",
    ]) ||
    includesAny([signals.paymentStatus, signals.invoiceStatus], [
      "invoice_issued",
      "pending_payment",
      "payment_pending",
      "awaiting_payment",
      "reupload_required",
      "issued",
      "open",
      "unpaid",
    ])
  ) {
    return "awaiting_payment";
  }

  if (
    includesAny([signals.status, signals.bookingStatus], [
      "draft",
      "pending",
      "submitted",
      "pending_draft",
      "pending_verification",
      "ready_to_continue",
      "incomplete_booking",
      "in_progress",
      "started",
    ]) ||
    (!signals.status &&
      !signals.bookingStatus &&
      includesAny([signals.contractStatus], ["draft", "pending"]))
  ) {
    return "in_progress";
  }

  if (!statusValues.length) {
    return "in_progress";
  }

  warnUnknownStatus(signals);
  return "processing";
}

export function getBookingStatusMeta(bookingOrStatus) {
  const key = resolveStatusKey(bookingOrStatus);

  return {
    key,
    ...BOOKING_STATUS_GROUPS[key],
  };
}

export function getBookingStatusLabel(bookingOrStatus) {
  return getBookingStatusMeta(bookingOrStatus).label;
}

export function getBookingStatusTone(bookingOrStatus) {
  return getBookingStatusMeta(bookingOrStatus).tone;
}

export function getBookingNextAction(bookingOrStatus) {
  const booking = isObject(bookingOrStatus) ? bookingOrStatus : null;
  const meta = getBookingStatusMeta(bookingOrStatus);

  if (booking && hasContractPending(booking) && ["awaiting_payment", "under_review"].includes(meta.key)) {
    return "Review and accept your rental contract.";
  }

  return meta.nextAction;
}

export function isActiveBooking(bookingOrStatus) {
  return ACTIVE_BOOKING_STATUS_KEYS.includes(getBookingStatusMeta(bookingOrStatus).key);
}

export function isHistoryBooking(bookingOrStatus) {
  return HISTORY_BOOKING_STATUS_KEYS.includes(getBookingStatusMeta(bookingOrStatus).key);
}

export function getBookingStatusSubtext(bookingOrStatus) {
  return getBookingNextAction(bookingOrStatus);
}

export function getBookingAmountLabel(bookingOrStatus) {
  const meta = getBookingStatusMeta(bookingOrStatus);
  return meta.key === "awaiting_payment" ? "Amount Due" : "Total";
}

export function getBookingCanonicalStatusValue(booking) {
  return normalizeText(
    firstPresent(booking?.status, booking?.bookingStatus, booking?.paymentStatus, booking?.invoiceStatus)
  );
}
