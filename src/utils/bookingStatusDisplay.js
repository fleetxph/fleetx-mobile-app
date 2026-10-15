export const BOOKING_STATUS_FILTERS = [
  { key: "all", label: "All", tone: "all" },
  { key: "final_balance_due", label: "Final Balance Due", tone: "balance-due" },
  { key: "payment", label: "Payment", tone: "payment" },
  { key: "confirmed", label: "Confirmed", tone: "confirmed" },
  { key: "completed", label: "Completed", tone: "completed" },
  { key: "cancelled", label: "Cancelled", tone: "cancelled" },
  { key: "open", label: "Drafts & Review", tone: "progress" },
];

const BOOKING_STATUS_GROUPS = {
  unknown: {
    label: "Unknown status",
    subtext: "Booking status is unavailable.",
    tone: "neutral",
    statuses: [],
  },
  in_progress: {
    label: "In Progress",
    subtext: "Finish your booking",
    tone: "progress",
    statuses: ["draft", "pending_verification", "ready_to_continue"],
  },
  booking_review: {
    label: "Booking Review",
    subtext: "We're reviewing your booking details. You'll be notified once there's an update.",
    tone: "review",
    statuses: ["pending_approval", "pending"],
  },
  awaiting_payment: {
    label: "Awaiting Payment",
    subtext: "Your invoice is ready. Please upload your payment proof after sending payment.",
    tone: "payment",
    statuses: ["pending_payment", "awaiting_payment", "invoice_issued"],
  },
  under_review: {
    label: "Payment under review",
    subtext: "We received your payment proof. FleetX will check the transaction details and update your booking once reviewed.",
    tone: "review",
    statuses: [
      "payment_submitted",
      "payment_verification",
      "payment_under_review",
      "pending_payment_verification",
      "payment_resubmitted",
      "under_review",
    ],
  },
  confirmed: {
    label: "Confirmed",
    subtext: "Please keep your booking details and receipt available during your trip.",
    tone: "confirmed",
    statuses: ["approved", "booked_confirmed", "confirmed", "payment_verified"],
  },
  active: {
    label: "Active",
    subtext: "Your trip is in progress. Keep your booking details and receipt available.",
    tone: "confirmed",
    statuses: ["active", "ongoing"],
  },
  completed: {
    label: "Completed",
    subtext: "Trip completed successfully",
    tone: "completed",
    statuses: ["completed"],
  },
  payment_rejected: {
    label: "Payment Rejected",
    subtext: "Your payment proof was rejected. Please upload a new proof of payment.",
    tone: "cancelled",
    statuses: ["payment_rejected"],
  },
  cancelled: {
    label: "Cancelled",
    subtext: "This booking has been cancelled",
    tone: "cancelled",
    statuses: ["rejected", "cancelled", "cancelled_conflict", "expired"],
  },
};

const FILTER_STATUS_GROUPS = {
  open: ["draft", "pending_verification", "ready_to_continue", "pending", "pending_approval"],
  payment: [
    "invoice_issued",
    "awaiting_payment",
    "pending_payment",
    "payment_submitted",
    "payment_verification",
    "payment_under_review",
    "pending_payment_verification",
    "payment_rejected",
    "payment_resubmitted",
    "under_review",
  ],
  confirmed: ["approved", "booked_confirmed", "confirmed", "active", "ongoing", "payment_verified"],
  completed: ["completed"],
  cancelled: ["cancelled", "rejected", "cancelled_conflict", "expired"],
};

const CLOSED_STATUS_KEYS = ["completed", "cancelled"];

function normalizeStatus(bookingOrStatus) {
  const raw = bookingOrStatus && typeof bookingOrStatus === "object"
    ? bookingOrStatus.status
    : bookingOrStatus;
  return String(raw || "").trim().toLowerCase();
}

export function getBookingStatusMeta(bookingOrStatus) {
  const normalized = normalizeStatus(bookingOrStatus);
  const key = Object.keys(BOOKING_STATUS_GROUPS).find((groupKey) =>
    BOOKING_STATUS_GROUPS[groupKey].statuses.includes(normalized)
  ) || "unknown";
  const meta = BOOKING_STATUS_GROUPS[key];
  return { key, ...meta, nextAction: meta.subtext };
}

export function getBookingStatusLabel(bookingOrStatus) {
  return getBookingStatusMeta(bookingOrStatus).label;
}

export function getBookingStatusTone(bookingOrStatus) {
  return getBookingStatusMeta(bookingOrStatus).tone;
}

export function getBookingStatusSubtext(bookingOrStatus) {
  return getBookingStatusMeta(bookingOrStatus).subtext;
}

export function getBookingStatusClass(bookingOrStatus) {
  return `booking-status booking-status--${getBookingStatusTone(bookingOrStatus)}`;
}

export function getBookingNextAction(bookingOrStatus) {
  return getBookingStatusSubtext(bookingOrStatus);
}

export function getBookingAmountLabel(bookingOrStatus) {
  return getBookingStatusMeta(bookingOrStatus).key === "awaiting_payment" ? "Amount Due" : "Total";
}

export function getBookingFilterGroup(bookingOrStatus) {
  const status = normalizeStatus(bookingOrStatus);
  return Object.keys(FILTER_STATUS_GROUPS).find((key) => FILTER_STATUS_GROUPS[key].includes(status)) || "unknown";
}

export function isFinalBalanceDue(booking) {
  if (typeof booking?.finalBalanceDue === "boolean") return booking.finalBalanceDue;
  const finalBalance = Number(booking?.financialSummary?.finalBalance);
  const settlementUnderReview =
    String(booking?.additionalPayment?.status || "").toLowerCase() === "under_review" &&
    Boolean(booking?.additionalPayment?.proofUrl);
  return normalizeStatus(booking) === "completed" &&
    Number.isFinite(finalBalance) && finalBalance > 0 && !settlementUnderReview;
}

export function canRequestBookingExtension(booking) {
  if (booking?.extensionRequestIneligibleReason) return false;
  const status = String(booking?.status || "").toLowerCase();
  if (![
    "approved",
    "confirmed",
    "booked_confirmed",
    "active",
    "ongoing",
    "payment_verified",
  ].includes(status)) return false;
  return !(booking.extensionRequests || []).some(
    (request) => String(request.status || "").toLowerCase() === "pending"
  );
}

export function isActiveBooking(bookingOrStatus) {
  return !CLOSED_STATUS_KEYS.includes(getBookingStatusMeta(bookingOrStatus).key) &&
    getBookingStatusMeta(bookingOrStatus).key !== "unknown";
}

export function isHistoryBooking(bookingOrStatus) {
  return CLOSED_STATUS_KEYS.includes(getBookingStatusMeta(bookingOrStatus).key);
}
