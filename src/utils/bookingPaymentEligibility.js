import { getBookingStatusMeta } from "./bookingStatusDisplay.js";

function normalizeLower(value) {
  return String(value || "").trim().toLowerCase();
}

export function getInitialPaymentProofEligibility(booking) {
  const status = normalizeLower(booking?.status);
  const paymentStatus = normalizeLower(booking?.paymentStatus);
  const statusMeta = getBookingStatusMeta(booking);
  const hasInvoiceOrPaymentDetails = Boolean(
    booking?.invoiceReference ||
      booking?.invoiceNumber ||
      booking?.invoice?.invoiceNumber ||
      booking?.invoice?.reference ||
      booking?.amountDue ||
      booking?.amountToPay ||
      booking?.invoiceAmount ||
      booking?.paymentMethod ||
      booking?.paymentOption ||
      booking?.paymentInstructions ||
      booking?.paymentDetails
  );
  const isUnderReview =
    ["submitted", "payment_submitted", "under_review", "pending"].includes(paymentStatus) ||
    statusMeta.key === "under_review";
  const isLocked =
    ["verified", "fully_paid", "downpayment_paid"].includes(paymentStatus) ||
    ["confirmed", "completed", "cancelled"].includes(statusMeta.key);
  const locallyEligible =
    !isUnderReview &&
    !isLocked &&
    (statusMeta.key === "awaiting_payment" ||
      (status === "approved" && hasInvoiceOrPaymentDetails) ||
      ["invoice_issued", "pending_payment", "payment_pending", "rejected", "reupload_required"].includes(
        paymentStatus
      ));
  return {
    isEligible: typeof booking?.paymentProofUploadEligible === "boolean"
      ? booking.paymentProofUploadEligible
      : locallyEligible,
    isUnderReview,
    isLocked,
    hasInvoiceOrPaymentDetails,
  };
}

export function getAdditionalPaymentProofEligibility(booking) {
  const status = normalizeLower(booking?.status);
  const payment = booking?.additionalPayment || {};
  const paymentStatus = normalizeLower(payment.status);
  const completedFinalBalance = status === "completed"
    ? Number(booking?.financialSummary?.finalBalance)
    : 0;
  const additionalTotal = Number(payment.totalAdditionalAmount || 0);
  const computedOutstandingBalance = Math.max(
    0,
    Number(booking?.totalPrice || 0) - additionalTotal - Number(booking?.amountPaid || 0)
  );
  const outstandingBalanceAmount = Math.max(
    Number(payment.outstandingBalanceAmount || 0),
    computedOutstandingBalance
  );
  const amountDue = status === "completed"
    ? completedFinalBalance
    : Math.max(
        Number(payment.totalAmountDue || 0),
        additionalTotal + outstandingBalanceAmount
      );
  const locallyEligible = Boolean(payment.required) && amountDue > 0 &&
    ["awaiting_payment", "rejected"].includes(paymentStatus) &&
    !["cancelled", "cancelled_conflict", "expired"].includes(status) &&
    (status !== "completed" || completedFinalBalance > 0);
  return {
    amountDue: Number.isFinite(amountDue) && amountDue > 0 ? amountDue : 0,
    eligible: typeof booking?.additionalPaymentProofEligible === "boolean"
      ? booking.additionalPaymentProofEligible
      : locallyEligible,
    reason: booking?.additionalPaymentProofReason || "",
    status: paymentStatus,
  };
}

export function buildAdditionalPaymentProofPayload({
  booking,
  paymentProof,
  paymentReference = "",
  paymentAmount,
} = {}) {
  const additionalPayment = booking?.additionalPayment || {};
  const isCompleted = normalizeLower(booking?.status) === "completed";
  return {
    ...(additionalPayment.extensionRequestId
      ? {
          extensionRequestId: additionalPayment.extensionRequestId,
          invoiceReference: additionalPayment.invoiceReference,
        }
      : {}),
    paymentReference,
    paymentProof,
    ...(isCompleted ? { paymentAmount } : {}),
  };
}
