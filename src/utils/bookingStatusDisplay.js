export const BOOKING_STATUS_FILTERS = [
  { key: "all", label: "All", tone: "all" },
  { key: "in_progress", label: "In Progress", tone: "progress" },
  { key: "awaiting_payment", label: "Awaiting Payment", tone: "payment" },
  { key: "under_review", label: "Under Review", tone: "review" },
  { key: "confirmed", label: "Confirmed", tone: "confirmed" },
  { key: "completed", label: "Completed", tone: "completed" },
  { key: "cancelled", label: "Cancelled", tone: "cancelled" },
];

const BOOKING_STATUS_GROUPS = {
  in_progress: {
    label: "In Progress",
    subtext: "Finish your booking",
    tone: "progress",
    statuses: ["draft", "pending_verification", "ready_to_continue"],
  },
  awaiting_payment: {
    label: "Awaiting Payment",
    subtext: "Complete your payment to proceed",
    tone: "payment",
    statuses: ["pending_payment", "awaiting_payment", "invoice_issued", "payment_rejected"],
  },
  under_review: {
    label: "Under Review",
    subtext: "Waiting for approval",
    tone: "review",
    statuses: ["under_review", "payment_submitted", "pending_approval", "pending"],
  },
  confirmed: {
    label: "Confirmed",
    subtext: "Your booking is confirmed",
    tone: "confirmed",
    statuses: ["approved", "booked_confirmed", "confirmed"],
  },
  completed: {
    label: "Completed",
    subtext: "Trip completed successfully",
    tone: "completed",
    statuses: ["completed"],
  },
  cancelled: {
    label: "Cancelled",
    subtext: "This booking has been cancelled",
    tone: "cancelled",
    statuses: ["rejected", "cancelled", "cancelled_conflict", "expired"],
  },
};

export function getBookingStatusMeta(status) {
  const normalized = String(status || "").toLowerCase();
  const key =
    Object.keys(BOOKING_STATUS_GROUPS).find((groupKey) =>
      BOOKING_STATUS_GROUPS[groupKey].statuses.includes(normalized)
    ) || "under_review";

  return {
    key,
    ...BOOKING_STATUS_GROUPS[key],
  };
}

export function getBookingStatusLabel(status) {
  return getBookingStatusMeta(status).label;
}

export function getBookingStatusTone(status) {
  return getBookingStatusMeta(status).tone;
}

export function getBookingStatusSubtext(status) {
  return getBookingStatusMeta(status).subtext;
}
