import test from "node:test";
import assert from "node:assert/strict";
import {
  canRequestBookingExtension,
  getBookingFilterGroup,
  getBookingStatusLabel as getMobileBookingStatusLabel,
  getBookingStatusSubtext as getMobileBookingStatusSubtext,
  isFinalBalanceDue,
} from "./bookingStatusDisplay.js";
import {
  getBookingStatusLabel as getWebBookingStatusLabel,
  getBookingStatusSubtext as getWebBookingStatusSubtext,
} from "../../../fleetx-customer-web/src/utils/bookingStatusDisplay.js";
import {
  buildAdditionalPaymentProofPayload,
  getAdditionalPaymentProofEligibility,
  getInitialPaymentProofEligibility,
} from "./bookingPaymentEligibility.js";

const STATUS_CASES = [
  ["draft", "In Progress"],
  ["pending_approval", "Booking Review"],
  ["pending", "Booking Review"],
  ["invoice_issued", "Awaiting Payment"],
  ["payment_submitted", "Payment under review"],
  ["approved", "Confirmed"],
  ["confirmed", "Confirmed"],
  ["active", "Active"],
  ["ongoing", "Active"],
  ["completed", "Completed"],
  ["payment_rejected", "Payment Rejected"],
  ["rejected", "Cancelled"],
  ["cancelled", "Cancelled"],
  ["expired", "Cancelled"],
];

test("mobile and web render the same booking status for identical booking data", () => {
  for (const [status, expectedLabel] of STATUS_CASES) {
    const booking = { status };
    assert.equal(getMobileBookingStatusLabel(booking), expectedLabel, `mobile ${status}`);
    assert.equal(getWebBookingStatusLabel(status), expectedLabel, `web ${status}`);
    assert.equal(
      getMobileBookingStatusSubtext(booking),
      getWebBookingStatusSubtext(status),
      `subtext ${status}`
    );
  }
});

test("extension eligibility follows the customer web rules", () => {
  for (const status of ["approved", "confirmed", "booked_confirmed", "active", "ongoing", "payment_verified"]) {
    assert.equal(canRequestBookingExtension({ status }), true, status);
  }
  assert.equal(
    canRequestBookingExtension({ status: "confirmed", extensionRequests: [{ status: "pending" }] }),
    false
  );
  assert.equal(
    canRequestBookingExtension({ status: "confirmed", extensionRequestIneligibleReason: "Settle balance" }),
    false
  );
  assert.equal(canRequestBookingExtension({ status: "draft" }), false);
  assert.equal(canRequestBookingExtension({ status: "cancelled" }), false);
});

test("customer web filter groups and final balance rules are represented on mobile", () => {
  assert.equal(getBookingFilterGroup({ status: "pending_approval" }), "open");
  assert.equal(getBookingFilterGroup({ status: "payment_rejected" }), "payment");
  assert.equal(getBookingFilterGroup({ status: "ongoing" }), "confirmed");
  assert.equal(getBookingFilterGroup({ status: "expired" }), "cancelled");
  assert.equal(
    isFinalBalanceDue({ status: "completed", finalBalanceDue: true, financialSummary: { finalBalance: 75 } }),
    true
  );
  assert.equal(
    isFinalBalanceDue({
      status: "completed",
      financialSummary: { finalBalance: 75 },
      additionalPayment: { status: "under_review", proofUrl: "proof.jpg" },
    }),
    false
  );
});

test("additional payment eligibility honors backend eligibility and review state", () => {
  const requiredPayment = {
    status: "confirmed",
    totalPrice: 1200,
    amountPaid: 800,
    additionalPayment: { required: true, status: "awaiting_payment", totalAmountDue: 400 },
  };
  assert.deepEqual(getAdditionalPaymentProofEligibility(requiredPayment), {
    amountDue: 400,
    eligible: true,
    reason: "",
    status: "awaiting_payment",
  });
  assert.equal(
    getAdditionalPaymentProofEligibility({
      ...requiredPayment,
      additionalPaymentProofEligible: false,
      additionalPaymentProofReason: "Your payment proof is already under review.",
    }).eligible,
    false
  );
  assert.equal(
    getAdditionalPaymentProofEligibility({
      status: "completed",
      financialSummary: { finalBalance: 250 },
      additionalPayment: { status: "under_review", proofUrl: "proof.jpg" },
      additionalPaymentProofEligible: false,
    }).amountDue,
    250
  );
});

test("initial payment eligibility honors server gating and blocks duplicate review submissions", () => {
  assert.equal(
    getInitialPaymentProofEligibility({
      status: "awaiting_payment",
      paymentProofUploadEligible: true,
    }).isEligible,
    true
  );
  assert.equal(
    getInitialPaymentProofEligibility({
      status: "awaiting_payment",
      paymentStatus: "submitted",
      paymentProofUploadEligible: false,
    }).isEligible,
    false
  );
  assert.equal(
    getInitialPaymentProofEligibility({
      status: "awaiting_payment",
      paymentProofUploadEligible: false,
    }).isEligible,
    false
  );
});

test("additional payment proof payload includes applicable invoice and final balance fields", () => {
  assert.deepEqual(
    buildAdditionalPaymentProofPayload({
      booking: {
        status: "completed",
        additionalPayment: {
          extensionRequestId: "ext-123",
          invoiceReference: "INV-456",
        },
      },
      paymentReference: "TX-789",
      paymentProof: "data:image/jpeg;base64,abc",
      paymentAmount: 125,
    }),
    {
      extensionRequestId: "ext-123",
      invoiceReference: "INV-456",
      paymentReference: "TX-789",
      paymentProof: "data:image/jpeg;base64,abc",
      paymentAmount: 125,
    }
  );
  assert.deepEqual(
    buildAdditionalPaymentProofPayload({
      booking: { status: "confirmed" },
      paymentProof: "proof",
    }),
    { paymentReference: "", paymentProof: "proof" }
  );
});
