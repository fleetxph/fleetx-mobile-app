export function getVerificationLevel(data) {
  return String(data?.verificationLevel || "").toLowerCase();
}

function normalizeDocumentStatus(value) {
  const status = String(value || "").toLowerCase();
  if (["approved", "verified", "fully_verified", "basic_verified"].includes(status)) {
    return "verified";
  }
  if (["pending", "pending_review", "under_review", "submitted"].includes(status)) {
    return "under_review";
  }
  if (status === "rejected") return "rejected";
  return "missing";
}

function hasValue(value) {
  return Boolean(String(value || "").trim());
}

export function getDocumentVerificationMeta(data, type) {
  const isLicense = type === "license" || type === "selfDrive";
  const status = normalizeDocumentStatus(
    isLicense
      ? data?.driverLicenseStatus || data?.licenseStatus
      : data?.validIdStatus
  );
  const hasBothSides = isLicense
    ? hasValue(data?.licenseFront || data?.driverLicenseImage || data?.idBackImage) &&
      hasValue(data?.licenseBack)
    : hasValue(data?.validIdFront || data?.validIdImage || data?.idFrontImage) &&
      hasValue(data?.validIdBack);
  const backendAvailable = isLicense
    ? Boolean(data?.canBookSelfDrive)
    : Boolean(data?.canBookWithDriver);

  if (backendAvailable || status === "verified") {
    return {
      key: "verified",
      label: "Verified",
      availabilityLabel: "Available",
      available: true,
      tone: "success",
      hasDocuments: hasBothSides,
    };
  }

  if (status === "rejected") {
    return {
      key: "rejected",
      label: "Rejected",
      availabilityLabel: "Rejected",
      available: false,
      tone: "danger",
      hasDocuments: hasBothSides,
    };
  }

  if (status === "under_review" || hasBothSides) {
    return {
      key: "under_review",
      label: "Under Review",
      availabilityLabel: "Under Review",
      available: false,
      tone: "warning",
      hasDocuments: hasBothSides,
    };
  }

  return {
    key: "missing",
    label: "Missing",
    availabilityLabel: "Unavailable",
    available: false,
    tone: "neutral",
    hasDocuments: false,
  };
}

export function getVerificationStatusValue(data) {
  return String(
    data?.overallVerificationStatus ||
      data?.overallStatus ||
      data?.verificationStatus ||
      data?.status ||
      "not_submitted"
  ).toLowerCase();
}

export function getVerificationBadgeLabel(data) {
  const status = getVerificationStatusValue(data);
  const level = getVerificationLevel(data);

  if (status === "rejected") return "Rejected";
  if (["pending", "under_review", "pending_review"].includes(status)) return "Under Review";
  if (status === "fully_verified" || (status === "approved" && level === "full")) return "Fully Verified";
  if (status === "basic_verified" || (status === "approved" && level === "basic")) return "Basic Verified";
  return "Get Verified";
}

export function getVerificationActionLabel(data) {
  const status = getVerificationStatusValue(data);
  const level = getVerificationLevel(data);

  if (status === "rejected") return "Resubmit Documents";
  if (["pending", "under_review", "pending_review"].includes(status)) return "View Submission";
  if (["basic_verified", "fully_verified"].includes(status) || (status === "approved" && ["basic", "full"].includes(level))) {
    return "View Verification";
  }
  return "Start Verification";
}

export function getVerificationSubtitle() {
  return "Valid ID required for With Driver\nDriver's License required for Self-Drive";
}

export function getVerificationStatusTone(data) {
  const status = getVerificationStatusValue(data);
  const level = getVerificationLevel(data);

  if (status === "rejected") return "danger";
  if (["pending", "under_review", "pending_review"].includes(status)) return "warning";
  if (status === "fully_verified" || (status === "approved" && level === "full")) return "success";
  if (status === "basic_verified" || (status === "approved" && level === "basic")) return "info";
  return "neutral";
}

export function getBookingEligibility(data) {
  const withDriver = getDocumentVerificationMeta(data, "validId");
  const selfDrive = getDocumentVerificationMeta(data, "license");

  return {
    withDriver: withDriver.available,
    selfDrive: selfDrive.available,
    withDriverLabel: withDriver.availabilityLabel,
    selfDriveLabel: selfDrive.availabilityLabel,
    withDriverTone: withDriver.tone,
    selfDriveTone: selfDrive.tone,
    validId: withDriver,
    license: selfDrive,
  };
}

export function formatReviewDate(value) {
  if (!value) return "Not yet reviewed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet reviewed";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
