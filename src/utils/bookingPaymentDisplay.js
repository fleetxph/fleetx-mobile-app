import { getInvoicePdfSource, getReceiptPdfSource } from "./bookingDocuments";

function firstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function valueFromSource(source, keys = []) {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    const value = source?.[key];
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

function toPositiveAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatPaymentOptionLabel(option) {
  if (option === "down_payment_50") return "50% Down Payment";
  if (option === "full_payment") return "Full Payment";
  return normalizeText(option);
}

export function isAwaitingPaymentBooking(booking) {
  const status = normalizeLower(booking?.status);
  const paymentStatus = normalizeLower(booking?.paymentStatus);
  const hasInvoiceMarkers = Boolean(
    normalizeText(
      firstPresent(
        booking?.invoiceReference,
        booking?.invoiceNumber,
        booking?.invoice?.invoiceNumber,
        booking?.invoice?.reference
      )
    ) ||
      toPositiveAmount(
        firstPresent(
          booking?.amountDue,
          booking?.amountToPay,
          booking?.invoiceAmount,
          booking?.invoice?.amountDue,
          booking?.invoice?.amountToPay
        )
      ) > 0 ||
      normalizeText(getInvoicePdfSource(booking))
  );

  return (
    ["awaiting_payment", "pending_payment", "payment_rejected", "invoice_issued"].includes(status) ||
    ["invoice_issued", "pending_payment", "payment_pending", "rejected", "reupload_required"].includes(
      paymentStatus
    ) ||
    hasInvoiceMarkers
  );
}

export function getBookingCustomerStatusCopy(booking) {
  const status = normalizeLower(booking?.status);
  const paymentStatus = normalizeLower(booking?.paymentStatus);

  if (["completed"].includes(status)) {
    return "Trip completed.";
  }

  if (["approved", "booked_confirmed", "confirmed"].includes(status)) {
    return "Your booking is confirmed.";
  }

  if (
    ["submitted", "payment_submitted", "under_review", "pending"].includes(paymentStatus) ||
    ["under_review", "pending_approval", "pending"].includes(status)
  ) {
    return "Your payment proof is being reviewed.";
  }

  if (isAwaitingPaymentBooking(booking)) {
    return "Your invoice has been issued. Please follow the payment instructions.";
  }

  return "";
}

export function getBookingReceiptDetails(booking) {
  const status = normalizeLower(booking?.status);
  const paymentStatus = normalizeLower(booking?.paymentStatus);
  const receiptNumber = normalizeText(
    firstPresent(
      booking?.receiptNumber,
      booking?.receipt?.receiptNumber,
      booking?.receipt?.reference,
      booking?.receiptReference
    )
  );
  const receiptIssuedAt = firstPresent(
    booking?.receiptIssuedAt,
    booking?.receipt?.issuedAt,
    booking?.receipt?.receiptIssuedAt
  );
  const paymentVerifiedAt = firstPresent(
    booking?.paymentVerifiedAt,
    booking?.verifiedAt,
    booking?.receipt?.paymentVerifiedAt
  );
  const amountPaid = toPositiveAmount(
    firstPresent(
      booking?.amountPaid,
      booking?.receipt?.amountPaid,
      booking?.invoiceAmount,
      booking?.amountDue,
      booking?.totalPrice
    )
  );
  const bookingTotal = toPositiveAmount(
    firstPresent(booking?.totalPrice, booking?.invoiceTotal, booking?.receipt?.totalAmount)
  );
  const paymentMethod = normalizeText(
    firstPresent(
      booking?.selectedPaymentMethodName,
      booking?.paymentMethod,
      booking?.paymentChannel,
      booking?.receipt?.paymentMethod
    )
  );
  const paymentOption = normalizeText(
    formatPaymentOptionLabel(firstPresent(booking?.paymentOption, booking?.receipt?.paymentOption))
  );
  const receiptUrl = normalizeText(getReceiptPdfSource(booking));
  const isConfirmedStatus = ["confirmed", "approved", "booked_confirmed", "completed", "payment_verified"].includes(
    status
  );
  const isVerifiedPaymentStatus = ["payment_verified", "verified", "fully_paid", "downpayment_paid"].includes(
    paymentStatus
  );
  const hasReceiptData = Boolean(receiptNumber || receiptIssuedAt || paymentVerifiedAt || receiptUrl);
  const isEligible = (isConfirmedStatus || isVerifiedPaymentStatus) && hasReceiptData;

  return {
    receiptNumber,
    receiptIssuedAt,
    paymentVerifiedAt,
    amountPaid,
    bookingTotal,
    paymentMethod,
    paymentOption,
    receiptUrl,
    hasReceiptData,
    isEligible,
  };
}

export function getBookingInvoicePaymentDetails(booking) {
  const invoice = booking?.invoice || {};
  const paymentDetails =
    booking?.paymentDetails ||
    booking?.paymentInstruction ||
    booking?.paymentInstructions ||
    invoice?.paymentDetails ||
    invoice?.paymentInstruction ||
    invoice?.paymentInstructions ||
    {};

  const invoiceNumber = normalizeText(
    firstPresent(
      booking?.invoiceReference,
      booking?.invoiceNumber,
      invoice?.invoiceNumber,
      invoice?.reference,
      invoice?.referenceNumber
    )
  );
  const amountDue = toPositiveAmount(
    firstPresent(
      booking?.amountDue,
      booking?.amountToPay,
      invoice?.amountDue,
      invoice?.amountToPay,
      booking?.invoiceAmount,
      invoice?.amount
    )
  );
  const bookingTotal = toPositiveAmount(
    firstPresent(booking?.totalPrice, booking?.invoiceTotal, invoice?.totalAmount, invoice?.total)
  );
  const downPayment = toPositiveAmount(
    firstPresent(booking?.downPayment, invoice?.downPayment, booking?.depositAmount, invoice?.depositAmount)
  );
  const remainingBalance = toPositiveAmount(
    firstPresent(
      booking?.remainingBalance,
      invoice?.remainingBalance,
      bookingTotal > 0 && amountDue > 0 ? bookingTotal - amountDue : 0
    )
  );
  const paymentMethod = normalizeText(
    firstPresent(
      booking?.selectedPaymentMethodName,
      booking?.paymentMethod,
      booking?.paymentChannel,
      paymentDetails?.methodName,
      paymentDetails?.bankName,
      invoice?.paymentMethod
    )
  );
  const paymentOption = normalizeText(
    formatPaymentOptionLabel(firstPresent(booking?.paymentOption, invoice?.paymentOption))
  );
  const paymentInstructions = normalizeText(
    firstPresent(
      paymentDetails?.instructions,
      paymentDetails?.notes,
      paymentDetails?.description,
      booking?.paymentInstructions,
      invoice?.paymentInstructions,
      invoice?.instructions
    )
  );
  const bankName = normalizeText(
    firstPresent(
      paymentDetails?.bankName,
      paymentDetails?.bank,
      booking?.bankName,
      booking?.paymentBankName,
      invoice?.bankName
    )
  );
  const accountName = normalizeText(
    firstPresent(
      paymentDetails?.accountName,
      paymentDetails?.accountHolder,
      booking?.accountName,
      booking?.paymentAccountName,
      invoice?.accountName
    )
  );
  const accountNumber = normalizeText(
    firstPresent(
      paymentDetails?.accountNumber,
      paymentDetails?.accountNo,
      booking?.accountNumber,
      booking?.paymentAccountNumber,
      invoice?.accountNumber
    )
  );
  const eWalletNumber = normalizeText(
    firstPresent(
      paymentDetails?.eWalletNumber,
      paymentDetails?.mobileNumber,
      paymentDetails?.gcashNumber,
      booking?.eWalletNumber,
      invoice?.eWalletNumber
    )
  );
  const dueDate = firstPresent(booking?.paymentDueAt, booking?.paymentDeadline, invoice?.dueDate);
  const invoiceUrl = normalizeText(getInvoicePdfSource(booking));
  const receiptUrl = normalizeText(getReceiptPdfSource(booking));

  const hasInvoiceDetails = Boolean(
    invoiceNumber ||
      amountDue > 0 ||
      bookingTotal > 0 ||
      downPayment > 0 ||
      remainingBalance > 0 ||
      paymentMethod ||
      paymentOption ||
      paymentInstructions ||
      bankName ||
      accountName ||
      accountNumber ||
      eWalletNumber ||
      dueDate ||
      invoiceUrl
  );
  const hasPaymentChannelDetails = Boolean(
    paymentMethod || bankName || accountName || accountNumber || eWalletNumber || paymentInstructions
  );

  return {
    invoiceNumber,
    amountDue,
    bookingTotal,
    downPayment,
    remainingBalance,
    paymentMethod,
    paymentOption,
    paymentInstructions,
    bankName,
    accountName,
    accountNumber,
    eWalletNumber,
    dueDate,
    invoiceUrl,
    receiptUrl,
    hasInvoiceDetails,
    hasPaymentChannelDetails,
  };
}
