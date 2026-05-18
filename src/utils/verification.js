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

function valueAtPath(source, path) {
  if (!path || !source) return undefined;

  return path.split(".").reduce((current, key) => {
    if (current === undefined || current === null) return undefined;
    return current[key];
  }, source);
}

function pickFirstValue(source, paths = []) {
  for (const path of paths) {
    const value = valueAtPath(source, path);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function hasValue(value) {
  return Boolean(normalizeText(value));
}

function normalizeReviewStatus(value) {
  const status = normalizeLower(value);

  if (
    [
      "approved",
      "verified",
      "fully_verified",
      "basic_verified",
      "success",
      "accepted",
    ].includes(status)
  ) {
    return "approved";
  }

  if (
    [
      "pending",
      "pending_review",
      "under_review",
      "submitted",
      "processing",
      "reviewing",
    ].includes(status)
  ) {
    return "pending";
  }

  if (["rejected", "declined", "denied"].includes(status)) {
    return "rejected";
  }

  if (["needs_update", "reupload_required", "resubmit", "needs_resubmission"].includes(status)) {
    return "needs_update";
  }

  return "not_submitted";
}

const VERIFICATION_GROUP_CONFIG = {
  validId: {
    verificationType: "with_driver",
    title: "Valid ID Verification",
    successLabel: "Basic Verified",
    statusPaths: [
      "idVerificationStatus",
      "validIdStatus",
      "verification.validId.status",
      "verification.validId.verificationStatus",
      "documents.validId.status",
    ],
    approvedPaths: ["basicVerified"],
    slots: {
      front: {
        label: "Valid ID Front",
        helper: "Upload the front side of your government-issued ID.",
        valuePaths: [
          "validIdFront",
          "validIdImage",
          "idFrontImage",
          "documents.validId.front",
          "documents.validId.frontImage",
          "verification.validId.front",
          "verification.validId.frontImage",
        ],
        statusPaths: [
          "validIdFrontStatus",
          "idFrontStatus",
          "verification.validId.frontStatus",
          "documents.validId.frontStatus",
        ],
        remarkPaths: [
          "validIdFrontRemarks",
          "idFrontRemarks",
          "verification.validId.frontRemarks",
          "documents.validId.frontRemarks",
        ],
      },
      back: {
        label: "Valid ID Back",
        helper: "Upload the back side of the same ID.",
        valuePaths: [
          "validIdBack",
          "idBackImage",
          "documents.validId.back",
          "documents.validId.backImage",
          "verification.validId.back",
          "verification.validId.backImage",
        ],
        statusPaths: [
          "validIdBackStatus",
          "idBackStatus",
          "verification.validId.backStatus",
          "documents.validId.backStatus",
        ],
        remarkPaths: [
          "validIdBackRemarks",
          "idBackRemarks",
          "verification.validId.backRemarks",
          "documents.validId.backRemarks",
        ],
      },
      selfie: {
        label: "Current Selfie",
        helper: "Take a clear selfie so we can match you with the submitted document.",
        valuePaths: [
          "idSelfie",
          "validIdSelfie",
          "documents.validId.selfie",
          "verification.validId.selfie",
          "verification.face.validIdSelfie",
          "verification.face.selfie",
          "documents.selfie.validId",
        ],
        statusPaths: [
          "idSelfieStatus",
          "validIdSelfieStatus",
          "selfieVerificationStatus",
          "faceVerificationStatus",
          "verification.validId.selfieStatus",
          "verification.face.validIdSelfieStatus",
        ],
        remarkPaths: [
          "idSelfieRemarks",
          "validIdSelfieRemarks",
          "selfieRemarks",
          "faceRemarks",
          "verification.validId.selfieRemarks",
          "verification.face.validIdSelfieRemarks",
        ],
      },
    },
    groupRemarkPaths: [
      "validIdRemarks",
      "verificationRemarks.validId",
      "verification.validId.remarks",
      "documents.validId.remarks",
      "adminRemarks",
      "rejectionReason",
      "remarks",
      "notes",
    ],
  },
  license: {
    verificationType: "self_drive",
    title: "Driver's License Verification",
    successLabel: "Fully Verified",
    statusPaths: [
      "licenseVerificationStatus",
      "driverLicenseStatus",
      "licenseStatus",
      "verification.license.status",
      "verification.license.verificationStatus",
      "documents.license.status",
    ],
    approvedPaths: ["fullyVerified", "isFullyVerified"],
    slots: {
      front: {
        label: "Driver's License Front",
        helper: "Upload the front side of your Driver's License.",
        valuePaths: [
          "licenseFront",
          "driverLicenseImage",
          "documents.license.front",
          "documents.license.frontImage",
          "verification.license.front",
          "verification.license.frontImage",
        ],
        statusPaths: [
          "licenseFrontStatus",
          "driverLicenseFrontStatus",
          "verification.license.frontStatus",
          "documents.license.frontStatus",
        ],
        remarkPaths: [
          "licenseFrontRemarks",
          "driverLicenseFrontRemarks",
          "verification.license.frontRemarks",
          "documents.license.frontRemarks",
        ],
      },
      back: {
        label: "Driver's License Back",
        helper: "Upload the back side of your Driver's License.",
        valuePaths: [
          "licenseBack",
          "documents.license.back",
          "documents.license.backImage",
          "verification.license.back",
          "verification.license.backImage",
        ],
        statusPaths: [
          "licenseBackStatus",
          "driverLicenseBackStatus",
          "verification.license.backStatus",
          "documents.license.backStatus",
        ],
        remarkPaths: [
          "licenseBackRemarks",
          "driverLicenseBackRemarks",
          "verification.license.backRemarks",
          "documents.license.backRemarks",
        ],
      },
      selfie: {
        label: "Current Selfie",
        helper: "Take a clear selfie so we can match you with the submitted document.",
        valuePaths: [
          "licenseSelfie",
          "driverLicenseSelfie",
          "documents.license.selfie",
          "verification.license.selfie",
          "verification.face.licenseSelfie",
          "documents.selfie.license",
        ],
        statusPaths: [
          "licenseSelfieStatus",
          "driverLicenseSelfieStatus",
          "licenseFaceStatus",
          "verification.license.selfieStatus",
          "verification.face.licenseSelfieStatus",
        ],
        remarkPaths: [
          "licenseSelfieRemarks",
          "driverLicenseSelfieRemarks",
          "licenseFaceRemarks",
          "verification.license.selfieRemarks",
          "verification.face.licenseSelfieRemarks",
        ],
      },
    },
    groupRemarkPaths: [
      "licenseRemarks",
      "driverLicenseRemarks",
      "verificationRemarks.license",
      "verification.license.remarks",
      "documents.license.remarks",
      "adminRemarks",
      "rejectionReason",
      "remarks",
      "notes",
    ],
  },
};

function getSlotMeta(data, groupKey, slotKey) {
  const config = VERIFICATION_GROUP_CONFIG[groupKey];
  const slot = config?.slots?.[slotKey];

  if (!slot) {
    return {
      key: "not_submitted",
      label: "Not submitted",
      tone: "neutral",
      uri: "",
      remarks: "",
      hasDocument: false,
    };
  }

  const uri = normalizeText(pickFirstValue(data, slot.valuePaths));
  const explicitStatus = normalizeReviewStatus(pickFirstValue(data, slot.statusPaths));
  const remarks = normalizeText(pickFirstValue(data, slot.remarkPaths));
  const hasDocument = Boolean(uri);

  let key = explicitStatus;
  if (key === "not_submitted" && hasDocument) {
    key = "pending";
  }

  if (key === "approved") {
    return { key, label: "Approved", tone: "success", uri, remarks, hasDocument };
  }

  if (key === "pending") {
    return { key, label: "Pending Review", tone: "warning", uri, remarks, hasDocument };
  }

  if (key === "rejected") {
    return { key, label: "Rejected", tone: "danger", uri, remarks, hasDocument };
  }

  if (key === "needs_update") {
    return { key, label: "Needs Update", tone: "danger", uri, remarks, hasDocument };
  }

  return {
    key: "not_submitted",
    label: hasDocument ? "Submitted" : "Not submitted",
    tone: hasDocument ? "info" : "neutral",
    uri,
    remarks,
    hasDocument,
  };
}

export function getVerificationGroupMeta(data, groupKey) {
  const config = VERIFICATION_GROUP_CONFIG[groupKey];
  const front = getSlotMeta(data, groupKey, "front");
  const back = getSlotMeta(data, groupKey, "back");
  const selfie = getSlotMeta(data, groupKey, "selfie");
  const explicitStatus = normalizeReviewStatus(pickFirstValue(data, config?.statusPaths || []));
  const isExplicitlyApproved = config?.approvedPaths?.some((path) => Boolean(valueAtPath(data, path)));
  const groupRemarks = normalizeText(pickFirstValue(data, config?.groupRemarkPaths || []));
  const hasAllDocuments = Boolean(front.hasDocument && back.hasDocument && selfie.hasDocument);
  const allSlotsApproved = [front, back, selfie].every((slot) => slot.key === "approved");
  const anyRejected = [front, back, selfie].some((slot) => slot.key === "rejected");
  const anyNeedsUpdate = [front, back, selfie].some((slot) => slot.key === "needs_update");
  const anyPending = [front, back, selfie].some((slot) => slot.key === "pending");
  const anySubmitted = [front, back, selfie].some((slot) => slot.hasDocument);

  let key = explicitStatus;

  if (isExplicitlyApproved || allSlotsApproved) {
    key = "approved";
  } else if (key === "not_submitted" && anyRejected) {
    key = "rejected";
  } else if (key === "not_submitted" && anyNeedsUpdate) {
    key = "needs_update";
  } else if (key === "not_submitted" && anyPending) {
    key = "pending";
  } else if (key === "not_submitted" && anySubmitted) {
    key = "pending";
  }

  const statusLabel =
    key === "approved"
      ? "Approved"
      : key === "pending"
      ? "Pending Review"
      : key === "rejected"
      ? "Rejected"
      : key === "needs_update"
      ? "Needs Update"
      : "Not submitted";
  const tone =
    key === "approved"
      ? "success"
      : key === "pending"
      ? "warning"
      : key === "rejected" || key === "needs_update"
      ? "danger"
      : "neutral";
  const remarks = groupRemarks || firstPresent(front.remarks, back.remarks, selfie.remarks);

  return {
    groupKey,
    verificationType: config?.verificationType || "",
    title: config?.title || "",
    successLabel: config?.successLabel || "",
    key,
    label: statusLabel,
    tone,
    remarks,
    hasAllDocuments,
    isApproved: key === "approved",
    isPending: key === "pending",
    isRejected: key === "rejected",
    needsUpdate: key === "needs_update",
    canEdit: !["approved", "pending"].includes(key),
    slots: {
      front,
      back,
      selfie,
    },
  };
}

export function getVerificationLevel(data) {
  return String(data?.verificationLevel || "").toLowerCase();
}

export function getDocumentVerificationMeta(data, type) {
  return getVerificationGroupMeta(data, type === "selfDrive" ? "license" : type);
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
  const validId = getVerificationGroupMeta(data, "validId");
  const license = getVerificationGroupMeta(data, "license");
  const level = getVerificationLevel(data);
  const overallStatus = normalizeReviewStatus(getVerificationStatusValue(data));
  const basicVerified =
    validId.isApproved ||
    Boolean(data?.basicVerified) ||
    (Boolean(data?.isVerified) && level !== "full");
  const fullyVerified =
    license.isApproved ||
    Boolean(data?.fullyVerified) ||
    Boolean(data?.isFullyVerified) ||
    level === "full";

  if (fullyVerified) return "Fully Verified";
  if (basicVerified) return "Basic Verified";
  if (validId.isRejected || license.isRejected || overallStatus === "rejected") return "Rejected";
  if (validId.needsUpdate || license.needsUpdate) return "Needs Update";
  if (validId.isPending || license.isPending || overallStatus === "pending") return "Pending Review";
  return "Not Verified";
}

export function getVerificationActionLabel(data) {
  const validId = getVerificationGroupMeta(data, "validId");
  const license = getVerificationGroupMeta(data, "license");
  const badge = getVerificationBadgeLabel(data);

  if (["Rejected", "Needs Update"].includes(badge) || validId.canEdit || license.canEdit) {
    return "Manage Verification";
  }

  if (badge === "Pending Review") return "View Submission";
  if (badge === "Basic Verified" || badge === "Fully Verified") return "View Verification";
  return "Start Verification";
}

export function getVerificationSubtitle() {
  return "Valid ID and current selfie for With Driver\nDriver's License and current selfie for Self-Drive";
}

export function getVerificationStatusTone(data) {
  const badge = getVerificationBadgeLabel(data);

  if (badge === "Rejected" || badge === "Needs Update") return "danger";
  if (badge === "Pending Review") return "warning";
  if (badge === "Fully Verified") return "success";
  if (badge === "Basic Verified") return "info";
  return "neutral";
}

export function getBookingEligibility(data) {
  const validId = getVerificationGroupMeta(data, "validId");
  const license = getVerificationGroupMeta(data, "license");

  return {
    withDriver: validId.isApproved,
    selfDrive: license.isApproved,
    withDriverLabel: validId.isApproved ? "Available" : validId.label,
    selfDriveLabel: license.isApproved ? "Available" : license.label,
    withDriverTone: validId.tone,
    selfDriveTone: license.tone,
    validId,
    license,
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
