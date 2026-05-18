import { getContractAcceptanceState } from "./bookingContractDisplay";
import {
  getBookingId,
  getInvoicePdfSource,
  getReceiptPdfSource,
  normalizeDocumentUrl,
} from "./bookingDocuments";
import {
  getBookingInvoicePaymentDetails,
  getBookingReceiptDetails,
} from "./bookingPaymentDisplay";
import { getBookingStatusMeta } from "./bookingStatusDisplay";

function firstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

const CANCELLABLE_STATUS_KEYS = new Set([
  "in_progress",
  "draft",
  "pending",
  "submitted",
  "awaiting_payment",
  "invoice_issued",
  "pending_payment",
]);

function toPositiveAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function getObject(source) {
  return source && typeof source === "object" ? source : {};
}

function getAdditionalDocumentUrl(source, booking = {}) {
  const record = getObject(source);
  const url = firstPresent(
    booking?.additionalInvoicePdfUrl,
    booking?.additionalInvoiceUrl,
    record?.invoicePdfUrl,
    record?.invoiceUrl,
    record?.pdfUrl,
    record?.url,
    record?.documentUrl,
    record?.fileUrl,
    record?.pdfPath,
    record?.filename
  );

  return url ? normalizeDocumentUrl(url) : "";
}

function getAdditionalStatusMeta(status) {
  const normalized = normalizeLower(status);

  if (["submitted", "under_review", "proof_uploaded", "pending_review"].includes(normalized)) {
    return {
      key: "under_review",
      label: "Under Review",
      helperText: "Additional payment proof is being reviewed.",
    };
  }

  if (
    ["verified", "paid", "fully_paid", "payment_verified", "completed"].includes(normalized)
  ) {
    return {
      key: "paid",
      label: "Verified",
      helperText: "Additional payment verified.",
    };
  }

  if (["rejected", "reupload_required"].includes(normalized)) {
    return {
      key: "rejected",
      label: "Rejected",
      helperText: "Additional payment proof needs to be uploaded again.",
    };
  }

  if (["pending", "additional_payment_pending", "awaiting_payment"].includes(normalized)) {
    return {
      key: "pending",
      label: "Pending Payment",
      helperText:
        "There are additional charges for this booking. Please review the invoice and upload proof of payment.",
    };
  }

  return {
    key: normalized ? "unknown" : "",
    label: normalized ? status : "",
    helperText: normalized
      ? "There are additional charges for this booking. Please review the invoice and upload proof of payment."
      : "",
  };
}

function getChargeItemAmount(item) {
  if (typeof item === "number" || typeof item === "string") {
    return toPositiveAmount(item);
  }

  if (!item || typeof item !== "object") return 0;

  return toPositiveAmount(
    firstPresent(item?.amount, item?.price, item?.total, item?.value, item?.cost, item?.fee)
  );
}

function getChargeItemLabel(item, fallbackLabel = "Charge") {
  if (typeof item === "string") {
    return normalizeText(item) || fallbackLabel;
  }

  if (!item || typeof item !== "object") return fallbackLabel;

  return normalizeText(
    firstPresent(
      item?.label,
      item?.title,
      item?.name,
      item?.reason,
      item?.description,
      item?.type,
      fallbackLabel
    )
  );
}

function getChargeItemDescription(item) {
  if (!item || typeof item !== "object") return "";

  return normalizeText(firstPresent(item?.description, item?.details, item?.notes));
}

function collectChargeBreakdown(booking, additionalInvoice) {
  const chargeGroups = [
    { items: toArray(additionalInvoice?.charges), label: "Additional Charge" },
    { items: toArray(additionalInvoice?.lineItems), label: "Charge" },
    { items: toArray(additionalInvoice?.items), label: "Charge" },
    { items: toArray(additionalInvoice?.breakdown), label: "Charge" },
    { items: toArray(booking?.additionalCharges), label: "Additional Charge" },
    { items: toArray(booking?.extraCharges), label: "Extra Charge" },
    { items: toArray(booking?.postTripCharges), label: "Post-Trip Charge" },
    { items: toArray(booking?.returnAssessment?.charges), label: "Return Assessment" },
  ];

  const results = [];

  chargeGroups.forEach((group) => {
    group.items.forEach((item, index) => {
      const label = getChargeItemLabel(item, `${group.label} ${index + 1}`);
      const amount = getChargeItemAmount(item);
      const description = getChargeItemDescription(item);

      if (!label && amount <= 0 && !description) return;

      results.push({
        label,
        amount,
        description,
      });
    });
  });

  const objectGroups = [
    {
      label: "Return Assessment",
      source: getObject(booking?.returnAssessment),
      amount: firstPresent(
        booking?.returnAssessment?.amountDue,
        booking?.returnAssessment?.totalAmount,
        booking?.returnAssessment?.amount
      ),
      description: firstPresent(
        booking?.returnAssessment?.reason,
        booking?.returnAssessment?.description,
        booking?.returnAssessment?.notes
      ),
    },
    {
      label: "Additional Charges",
      source: getObject(booking?.postTripCharges),
      amount: firstPresent(
        booking?.postTripCharges?.amountDue,
        booking?.postTripCharges?.totalAmount,
        booking?.postTripCharges?.amount,
        booking?.postTripCharges?.total
      ),
      description: firstPresent(
        booking?.postTripCharges?.reason,
        booking?.postTripCharges?.description,
        booking?.postTripCharges?.notes
      ),
    },
  ];

  objectGroups.forEach((group) => {
    if (!Object.keys(group.source).length) return;

    const amount = toPositiveAmount(group.amount);
    const description = normalizeText(group.description);

    if (!amount && !description) return;

    results.push({
      label: group.label,
      amount,
      description,
    });
  });

  const uniqueItems = [];
  const seen = new Set();

  results.forEach((item) => {
    const key = `${item.label}|${item.amount}|${item.description}`;
    if (seen.has(key)) return;
    seen.add(key);
    uniqueItems.push(item);
  });

  return uniqueItems;
}

export function getPaymentProofState(booking) {
  const statusMeta = getBookingStatusMeta(booking);
  const paymentStatus = normalizeLower(booking?.paymentStatus);
  const hasInvoiceContext = Boolean(
    getInvoicePdfSource(booking) ||
      getBookingInvoicePaymentDetails(booking).hasInvoiceDetails
  );
  const isUnderReview =
    statusMeta.key === "under_review" ||
    ["submitted", "payment_submitted", "under_review", "pending", "proof_uploaded"].includes(
      paymentStatus
    );
  const isLocked =
    ["confirmed", "completed", "cancelled"].includes(statusMeta.key) ||
    ["verified", "fully_paid", "downpayment_paid", "payment_verified"].includes(paymentStatus);
  const isResubmissionAllowed = ["rejected", "reupload_required"].includes(paymentStatus);

  return {
    hasInvoiceContext,
    isUnderReview,
    isLocked,
    isResubmissionAllowed,
    hasSubmittedProof: Boolean(isUnderReview || normalizeText(booking?.paymentProofUrl)),
  };
}

export function canViewInvoice(booking) {
  const statusMeta = getBookingStatusMeta(booking);
  return Boolean(
    getInvoicePdfSource(booking) ||
      getBookingInvoicePaymentDetails(booking).hasInvoiceDetails ||
      statusMeta.key === "awaiting_payment"
  );
}

export function canReviewContract(booking) {
  const statusMeta = getBookingStatusMeta(booking);
  const contractState = getContractAcceptanceState(booking);
  if (statusMeta.key === "cancelled") return false;
  return Boolean(contractState.requiresContract);
}

export function canUploadPaymentProof(booking) {
  const contractState = getContractAcceptanceState(booking);
  const proofState = getPaymentProofState(booking);
  const statusMeta = getBookingStatusMeta(booking);

  if (proofState.isLocked || proofState.isUnderReview) return false;
  if (!proofState.hasInvoiceContext && statusMeta.key !== "awaiting_payment") return false;
  if (contractState.requiresContract && !contractState.contractAccepted) return false;

  return ["awaiting_payment"].includes(statusMeta.key) || proofState.isResubmissionAllowed;
}

export function canViewReceipt(booking) {
  const statusMeta = getBookingStatusMeta(booking);
  const receiptDetails = getBookingReceiptDetails(booking);

  return Boolean(
    ["confirmed", "completed"].includes(statusMeta.key) &&
      receiptDetails.isEligible &&
      getReceiptPdfSource(booking)
  );
}

export function getAdditionalInvoiceDetails(booking) {
  const primaryAdditionalInvoice = getObject(booking?.additionalInvoice);
  const fallbackAdditionalInvoice = getObject(booking?.additionalInvoiceData);
  const additionalInvoice =
    Object.keys(primaryAdditionalInvoice).length > 0
      ? primaryAdditionalInvoice
      : fallbackAdditionalInvoice;
  const additionalCharges = toArray(booking?.additionalCharges);
  const extraCharges = toArray(booking?.extraCharges);
  const additionalChargesTotal = toPositiveAmount(
    firstPresent(
      booking?.additionalChargesTotal,
      booking?.additionalAmountDue,
      booking?.additionalBalance,
      typeof booking?.additionalCharges === "number" ? booking.additionalCharges : 0
    )
  );
  const extraChargesTotal = toPositiveAmount(
    firstPresent(
      booking?.extraChargesTotal,
      typeof booking?.extraCharges === "number" ? booking.extraCharges : 0
    )
  );
  const postTripCharges = booking?.postTripCharges;
  const returnAssessment = getObject(booking?.returnAssessment);
  const documentUrl = getAdditionalDocumentUrl(additionalInvoice, booking);
  const invoiceNumber = normalizeText(
    firstPresent(
      additionalInvoice?.invoiceNumber,
      additionalInvoice?.reference,
      additionalInvoice?.invoiceReference,
      booking?.additionalInvoiceNumber,
      booking?.additionalInvoiceReference
    )
  );
  const additionalStatus = normalizeLower(
    firstPresent(
      booking?.additionalPaymentStatus,
      additionalInvoice?.paymentStatus,
      additionalInvoice?.additionalPaymentStatus,
      additionalInvoice?.paymentProofStatus,
      additionalInvoice?.status
    )
  );
  const explicitAdditionalSignals = Boolean(
    Object.keys(additionalInvoice).length > 0 ||
      normalizeText(
        firstPresent(
          booking?.additionalInvoiceUrl,
          booking?.additionalInvoicePdfUrl,
          booking?.additionalPaymentStatus,
          booking?.additionalPaymentProofUrl,
          booking?.additionalAmountDue,
          booking?.additionalBalance,
          booking?.additionalChargesTotal,
          booking?.extraChargesTotal
        )
      ) ||
      additionalChargesTotal > 0 ||
      extraChargesTotal > 0 ||
      additionalCharges.length ||
      extraCharges.length ||
      Object.keys(getObject(postTripCharges)).length ||
      Object.keys(returnAssessment).length
  );
  const amountDue = toPositiveAmount(
    firstPresent(
      additionalInvoice?.amountDue,
      additionalInvoice?.balanceDue,
      additionalInvoice?.totalAmount,
      additionalInvoice?.amount,
      booking?.additionalAmountDue,
      booking?.additionalBalance,
      booking?.additionalChargesTotal,
      typeof booking?.additionalCharges === "number" ? booking.additionalCharges : 0,
      booking?.extraChargesTotal,
      typeof booking?.extraCharges === "number" ? booking.extraCharges : 0,
      booking?.postTripCharges?.amountDue,
      booking?.postTripCharges?.totalAmount,
      booking?.postTripCharges?.amount,
      booking?.returnAssessment?.amountDue,
      booking?.returnAssessment?.totalAmount,
      booking?.returnAssessment?.amount,
      explicitAdditionalSignals ? booking?.balanceDue : 0,
      explicitAdditionalSignals ? booking?.remainingBalance : 0
    )
  );
  const chargeBreakdown = collectChargeBreakdown(booking, additionalInvoice);
  const reason = normalizeText(
    firstPresent(
      additionalInvoice?.reason,
      additionalInvoice?.description,
      additionalInvoice?.notes,
      additionalInvoice?.summary,
      returnAssessment?.reason,
      returnAssessment?.description,
      chargeBreakdown[0]?.description,
      chargeBreakdown[0]?.label
    )
  );
  const dueDate = normalizeText(
    firstPresent(
      additionalInvoice?.dueDate,
      additionalInvoice?.paymentDueAt,
      additionalInvoice?.deadline,
      booking?.additionalInvoiceDueDate
    )
  );
  const additionalPaymentProofUrl = normalizeDocumentUrl(
    firstPresent(
      booking?.additionalPaymentProofUrl,
      additionalInvoice?.paymentProofUrl,
      additionalInvoice?.additionalPaymentProofUrl
    )
  );
  const statusMeta = getAdditionalStatusMeta(additionalStatus);
  const hasAdditionalBalance = Boolean(
    explicitAdditionalSignals &&
      (amountDue > 0 ||
      chargeBreakdown.length > 0 ||
      documentUrl ||
      additionalStatus ||
      additionalPaymentProofUrl)
  );

  return {
    invoiceNumber,
    amountDue,
    reason,
    status: additionalStatus,
    statusLabel: statusMeta.label,
    statusKey: statusMeta.key,
    helperText: statusMeta.helperText,
    dueDate,
    documentUrl,
    additionalPaymentProofUrl,
    hasAdditionalBalance,
    chargeBreakdown,
  };
}

export function canViewAdditionalInvoice(booking) {
  const details = getAdditionalInvoiceDetails(booking);
  return Boolean(details.hasAdditionalBalance && (details.documentUrl || getBookingId(booking)));
}

export function canCancelBooking(booking) {
  const statusMeta = getBookingStatusMeta(booking);
  const rawStatuses = [
    booking?.status,
    booking?.bookingStatus,
    booking?.paymentStatus,
    booking?.invoiceStatus,
  ].map(normalizeLower);

  if (["under_review", "confirmed", "completed", "cancelled"].includes(statusMeta.key)) {
    return false;
  }

  if (
    rawStatuses.some((value) =>
      [
        "under_review",
        "payment_submitted",
        "confirmed",
        "completed",
        "cancelled",
        "canceled",
        "rejected",
        "expired",
        "archived",
      ].includes(value)
    )
  ) {
    return false;
  }

  return rawStatuses.some((value) => CANCELLABLE_STATUS_KEYS.has(value)) || CANCELLABLE_STATUS_KEYS.has(statusMeta.key);
}

export function canUploadAdditionalPaymentProof(booking) {
  const details = getAdditionalInvoiceDetails(booking);

  if (!details.hasAdditionalBalance) return false;
  if (["paid", "under_review"].includes(details.statusKey)) return false;
  if (["pending", "rejected"].includes(details.statusKey)) return true;
  if (!details.statusKey) return Boolean(details.amountDue > 0 || details.documentUrl);

  return false;
}

export function getBookingActionState(booking) {
  const statusMeta = getBookingStatusMeta(booking);
  const contractState = getContractAcceptanceState(booking);
  const proofState = getPaymentProofState(booking);
  const invoiceDetails = getBookingInvoicePaymentDetails(booking);
  const receiptDetails = getBookingReceiptDetails(booking);
  const additionalInvoice = getAdditionalInvoiceDetails(booking);

  return {
    bookingId: getBookingId(booking),
    statusMeta,
    contractState,
    proofState,
    invoiceDetails,
    receiptDetails,
    additionalInvoice,
    canViewInvoice: canViewInvoice(booking),
    canReviewContract: canReviewContract(booking),
    canUploadPaymentProof: canUploadPaymentProof(booking),
    canViewReceipt: canViewReceipt(booking),
    canViewAdditionalInvoice: canViewAdditionalInvoice(booking),
    canUploadAdditionalPaymentProof: canUploadAdditionalPaymentProof(booking),
    canCancelBooking: canCancelBooking(booking),
  };
}
