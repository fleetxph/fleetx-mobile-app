function normalizeText(value) {
  return String(value || "").trim();
}

export function normalizeVerificationStatus(status) {
  const normalizedStatus = normalizeText(status).toLowerCase();

  if (["approved", "verified", "available", "valid", "fully_verified"].includes(normalizedStatus)) {
    return "approved";
  }

  if (
    ["pending", "pending_review", "under_review", "submitted", "in_review", "processing", "reviewing"].includes(
      normalizedStatus
    )
  ) {
    return "pending";
  }

  if (
    ["rejected", "denied", "needs_update", "require_update", "update_required", "declined"].includes(
      normalizedStatus
    )
  ) {
    return "needs_update";
  }

  if (
    ["missing", "not_submitted", "incomplete", "null", "undefined", "", "not_uploaded", "partial"].includes(
      normalizedStatus
    )
  ) {
    return "not_submitted";
  }

  return "not_submitted";
}

export function isVerificationApproved(status) {
  return normalizeVerificationStatus(status) === "approved";
}

export function isVerificationPending(status) {
  return normalizeVerificationStatus(status) === "pending";
}

export function isVerificationRejected(status) {
  return normalizeVerificationStatus(status) === "needs_update";
}

export function isVerificationEditable(status) {
  return ["not_submitted", "needs_update"].includes(normalizeVerificationStatus(status));
}

export function getVerificationStatusLabel(status) {
  const normalizedStatus = normalizeVerificationStatus(status);

  if (normalizedStatus === "approved") return "Approved";
  if (normalizedStatus === "pending") return "Pending Review";
  if (normalizedStatus === "needs_update") return "Needs Update";
  return "Not submitted";
}

export function getVerificationStatusTone(status) {
  const normalizedStatus = normalizeVerificationStatus(status);

  if (normalizedStatus === "approved") return "success";
  if (normalizedStatus === "pending") return "warning";
  if (normalizedStatus === "needs_update") return "danger";
  if (normalizedStatus === "selected") return "info";
  return "neutral";
}
