import {
  getVerificationStatusLabel,
  getVerificationStatusTone as getNormalizedVerificationStatusTone,
  isVerificationApproved,
  isVerificationEditable,
  isVerificationPending,
  isVerificationRejected,
  normalizeVerificationStatus,
} from "./verificationStatus";
import { getDocumentRenewalMeta } from "./documentExpiry";

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

export function normalizeReviewStatus(value) {
  const status = normalizeLower(value);

  if (["rejected", "declined", "denied"].includes(status)) {
    return "rejected";
  }

  if (
    [
      "needs_update",
      "reupload_required",
      "resubmit",
      "needs_resubmission",
      "not yet approved",
      "not_yet_approved",
      "require_update",
      "update_required",
    ].includes(status)
  ) {
    return "needs_update";
  }

  if (["missing", "not_uploaded"].includes(status)) {
    return "missing";
  }

  if (["incomplete", "partial"].includes(status)) {
    return "incomplete";
  }

  return normalizeVerificationStatus(status);
}

export function isVerificationGroupEditable(groupStatus, slotStatus) {
  const normalizedGroupStatus = normalizeReviewStatus(groupStatus);
  const normalizedSlotStatus = normalizeReviewStatus(slotStatus);
  const groupIsEditable =
    isVerificationEditable(normalizedGroupStatus) || ["missing", "incomplete", "rejected"].includes(normalizedGroupStatus);
  const slotIsEditable =
    isVerificationEditable(normalizedSlotStatus) || ["missing", "incomplete", "rejected"].includes(normalizedSlotStatus);
  const slotIsLocked = isVerificationApproved(normalizedSlotStatus) || isVerificationPending(normalizedSlotStatus);

  if (groupIsEditable) {
    return slotStatus ? !slotIsLocked : true;
  }

  if (isVerificationApproved(normalizedGroupStatus) || isVerificationPending(normalizedGroupStatus)) {
    return slotIsEditable;
  }

  return slotIsEditable;
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
          "validIdSelfieUrl",
          "idSelfieUrl",
          "idSelfie",
          "validIdSelfie",
          "faceVerificationPhotoUrl",
          "faceVerificationPhoto",
          "facePhotoUrl",
          "facePhoto",
          "selfieUrl",
          "selfie",
          "currentSelfieUrl",
          "currentSelfie",
          "verification.faceVerificationPhoto",
          "verification.facePhoto",
          "verification.selfie",
          "documents.validId.selfie",
          "documents.validId.selfieUrl",
          "verification.validId.selfie",
          "verification.validId.selfieUrl",
          "verification.face.validIdSelfie",
          "verification.face.validIdSelfieUrl",
          "verification.face.selfie",
          "documents.faceVerificationPhoto",
          "documents.faceVerificationPhotoUrl",
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
          "licenseSelfieUrl",
          "driverLicenseSelfieUrl",
          "licenseSelfie",
          "driverLicenseSelfie",
          "faceVerificationPhotoUrl",
          "faceVerificationPhoto",
          "facePhotoUrl",
          "facePhoto",
          "selfieUrl",
          "selfie",
          "currentSelfieUrl",
          "currentSelfie",
          "verification.faceVerificationPhoto",
          "verification.facePhoto",
          "verification.selfie",
          "documents.license.selfie",
          "documents.license.selfieUrl",
          "documents.driverLicense.selfie",
          "documents.driverLicense.selfieUrl",
          "verification.license.selfie",
          "verification.license.selfieUrl",
          "verification.driverLicense.selfie",
          "verification.driverLicense.selfieUrl",
          "verification.face.licenseSelfie",
          "verification.face.licenseSelfieUrl",
          "documents.faceVerificationPhoto",
          "documents.faceVerificationPhotoUrl",
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
    return { key, label: getVerificationStatusLabel(key), tone: getNormalizedVerificationStatusTone(key), uri, remarks, hasDocument };
  }

  if (key === "pending") {
    return { key, label: getVerificationStatusLabel(key), tone: getNormalizedVerificationStatusTone(key), uri, remarks, hasDocument };
  }

  if (key === "rejected") {
    return { key, label: "Rejected", tone: "danger", uri, remarks, hasDocument };
  }

  if (key === "needs_update") {
    return { key, label: "Needs Update", tone: "danger", uri, remarks, hasDocument };
  }

  if (key === "missing") {
    return { key, label: hasDocument ? "Needs Update" : "Not submitted", tone: hasDocument ? "danger" : "neutral", uri, remarks, hasDocument };
  }

  if (key === "incomplete") {
    return { key, label: hasDocument ? "Needs Update" : "Not submitted", tone: hasDocument ? "danger" : "neutral", uri, remarks, hasDocument };
  }

  return {
    key: "not_submitted",
    label: "Not submitted",
    tone: "neutral",
    uri,
    remarks,
    hasDocument,
  };
}

function getVerificationUrl(data, groupKey, slotKey) {
  const config = VERIFICATION_GROUP_CONFIG[groupKey];
  const slot = config?.slots?.[slotKey];
  return normalizeText(pickFirstValue(data, slot?.valuePaths || []));
}

export function getValidIdFrontUrl(data) {
  return getVerificationUrl(data, "validId", "front");
}

export function getValidIdBackUrl(data) {
  return getVerificationUrl(data, "validId", "back");
}

export function getValidIdSelfieUrl(data) {
  return getVerificationUrl(data, "validId", "selfie");
}

export function getLicenseFrontUrl(data) {
  return getVerificationUrl(data, "license", "front");
}

export function getLicenseBackUrl(data) {
  return getVerificationUrl(data, "license", "back");
}

export function getLicenseSelfieUrl(data) {
  return getVerificationUrl(data, "license", "selfie");
}

export function getVerificationServerFieldDebug(data) {
  return {
    hasValidIdFront: Boolean(getValidIdFrontUrl(data)),
    hasValidIdBack: Boolean(getValidIdBackUrl(data)),
    hasValidIdSelfie: Boolean(getValidIdSelfieUrl(data)),
    hasLicenseFront: Boolean(getLicenseFrontUrl(data)),
    hasLicenseBack: Boolean(getLicenseBackUrl(data)),
    hasLicenseSelfie: Boolean(getLicenseSelfieUrl(data)),
    topLevelKeys: Object.keys(data || {}).slice(0, 40),
    verificationKeys: Object.keys(data?.verification || {}).slice(0, 40),
    documentKeys: Object.keys(data?.documents || {}).slice(0, 40),
  };
}

export function getVerificationGroupMeta(data, groupKey) {
  const config = VERIFICATION_GROUP_CONFIG[groupKey];
  const expiryMeta = getDocumentRenewalMeta(data, groupKey);
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
  const anyMissing = [front, back, selfie].some((slot) => ["missing", "incomplete"].includes(slot.key));
  const anyPending = [front, back, selfie].some((slot) => slot.key === "pending");
  const anySubmitted = [front, back, selfie].some((slot) => slot.hasDocument);

  let key = explicitStatus;

  if (isExplicitlyApproved || allSlotsApproved) {
    key = "approved";
  } else if (key === "not_submitted" && anyMissing && anySubmitted) {
    key = "incomplete";
  } else if (key === "not_submitted" && anyRejected) {
    key = "rejected";
  } else if (key === "not_submitted" && anyNeedsUpdate) {
    key = "needs_update";
  } else if (key === "not_submitted" && anyPending) {
    key = "pending";
  } else if (key === "not_submitted" && anySubmitted) {
    key = "pending";
  }

  if ((expiryMeta.backendRequiresUpdate || expiryMeta.isExpired) && key === "approved") {
    key = "needs_update";
  }

  const statusLabel =
    key === "rejected"
      ? "Rejected"
      : key === "needs_update"
      ? "Needs Update"
      : key === "incomplete"
      ? "Incomplete"
      : getVerificationStatusLabel(key);
  const tone =
    key === "rejected" || key === "needs_update"
      ? "danger"
      : key === "incomplete"
      ? "warning"
      : getNormalizedVerificationStatusTone(key);
  const remarks = groupRemarks || firstPresent(front.remarks, back.remarks, selfie.remarks);
  const canEdit = [front, back, selfie].some((slot) => isVerificationGroupEditable(key, slot.key));

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
    isApproved: isVerificationApproved(key),
    isPending: isVerificationPending(key),
    isRejected: key === "rejected",
    needsUpdate: key === "needs_update" || isVerificationRejected(key),
    isIncomplete: key === "incomplete",
    canEdit,
    expiry: expiryMeta,
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

function normalizeEligibilityStatus(value) {
  const status = normalizeLower(value);

  if (["approved", "verified", "available", "fully_verified", "basic_verified", "valid"].includes(status)) {
    return "available";
  }

  if (["pending", "pending_review", "under_review", "submitted", "processing", "reviewing"].includes(status)) {
    return "pending_review";
  }

  if (["rejected", "needs_update", "denied", "declined"].includes(status)) {
    return "needs_update";
  }

  if (["missing", "not_submitted", "incomplete", "partial", ""].includes(status)) {
    return "not_submitted";
  }

  return "not_submitted";
}

function getEligibilityPresentation(status) {
  if (status === "available") {
    return { label: "Available", tone: "success", isAvailable: true };
  }

  if (status === "pending_review") {
    return { label: "Pending Review", tone: "warning", isAvailable: false };
  }

  if (status === "needs_update") {
    return { label: "Needs Update", tone: "danger", isAvailable: false };
  }

  return { label: "Not submitted", tone: "neutral", isAvailable: false };
}

function getEligibilityStatusFromMeta(groupMeta) {
  if (groupMeta?.expiry?.backendRequiresUpdate || groupMeta?.expiry?.isExpired) return "needs_update";
  if (groupMeta?.isApproved) return "available";
  if (groupMeta?.isPending) return "pending_review";
  if (groupMeta?.isRejected || groupMeta?.needsUpdate) return "needs_update";
  return "not_submitted";
}

export function isLicenseApprovedOrAvailable(data) {
  const license = getVerificationGroupMeta(data, "license");
  return normalizeEligibilityStatus(getEligibilityStatusFromMeta(license)) === "available";
}

export function doesLicenseSatisfyValidId(data) {
  return isLicenseApprovedOrAvailable(data);
}

export function getValidIdEquivalentDisplay(data) {
  const validId = getVerificationGroupMeta(data, "validId");
  const license = getVerificationGroupMeta(data, "license");
  const validIdStatus = normalizeEligibilityStatus(getEligibilityStatusFromMeta(validId));
  const licenseStatus = normalizeEligibilityStatus(getEligibilityStatusFromMeta(license));
  const licenseSatisfiesValidId = licenseStatus === "available";

  if (licenseSatisfiesValidId) {
    return {
      isEquivalentApproved: true,
      isEquivalentPending: false,
      displayedStatus: "approved_via_license",
      label: "Approved",
      tone: "success",
      levelValue: "Approved via Driver's License",
      summaryValue: "Driver's License already satisfies valid ID eligibility.",
      summarySubvalue: "Separate Valid ID upload is optional because your Driver's License is already approved.",
      helperText: "Your approved Driver's License can be used as a valid government ID for with-driver bookings.",
      hideUploadSlots: true,
    };
  }

  if (licenseStatus === "pending_review" && validIdStatus !== "available") {
    return {
      isEquivalentApproved: false,
      isEquivalentPending: true,
      displayedStatus: "pending_via_license",
      label: "Pending Review",
      tone: "warning",
      levelValue: "Pending via Driver's License",
      summaryValue: "Driver's License is under review and can satisfy valid ID once approved.",
      summarySubvalue: "You can wait for your Driver's License review or submit a separate Valid ID.",
      helperText: "With-driver eligibility can be approved from your Driver's License once review is complete.",
      hideUploadSlots: false,
    };
  }

  return {
    isEquivalentApproved: false,
    isEquivalentPending: false,
    displayedStatus: validIdStatus,
    label: validId.label,
    tone: validId.tone,
    levelValue: validId.isApproved ? validId.successLabel || "Approved" : "Not yet approved",
    summaryValue:
      validId.slots.front.hasDocument && validId.slots.back.hasDocument
        ? "Documents submitted"
        : "Documents incomplete",
    summarySubvalue: `Selfie: ${validId.slots.selfie.hasDocument ? "Captured" : "Missing"}`,
    helperText: "",
    hideUploadSlots: false,
  };
}

export function getBookingEligibilityFromVerification(data) {
  const validId = getVerificationGroupMeta(data, "validId");
  const license = getVerificationGroupMeta(data, "license");
  const validIdStatus = normalizeEligibilityStatus(getEligibilityStatusFromMeta(validId));
  const licenseStatus = normalizeEligibilityStatus(getEligibilityStatusFromMeta(license));

  let withDriverStatus = "not_submitted";
  let withDriverSource = "none";

  if (validIdStatus === "available") {
    withDriverStatus = "available";
    withDriverSource = "valid_id";
  } else if (licenseStatus === "available") {
    withDriverStatus = "available";
    withDriverSource = "license";
  } else if (validIdStatus === "pending_review") {
    withDriverStatus = "pending_review";
    withDriverSource = "valid_id";
  } else if (licenseStatus === "pending_review") {
    withDriverStatus = "pending_review";
    withDriverSource = "license";
  } else if (validIdStatus === "needs_update") {
    withDriverStatus = "needs_update";
    withDriverSource = "valid_id";
  } else if (licenseStatus === "needs_update") {
    withDriverStatus = "needs_update";
    withDriverSource = "license";
  }

  const selfDriveStatus = licenseStatus;
  const selfDriveSource = licenseStatus === "not_submitted" ? "none" : "license";
  const withDriverPresentation = getEligibilityPresentation(withDriverStatus);
  const selfDrivePresentation = getEligibilityPresentation(selfDriveStatus);

  if (__DEV__) {
    console.log("[VerificationExpiry][eligibilityImpact]", {
      validIdExpiryStatus: validId.expiry?.expiryStatus || "unknown",
      licenseExpiryStatus: license.expiry?.expiryStatus || "unknown",
      withDriverStatus,
      selfDriveStatus,
    });
  }

  return {
    withDriverStatus,
    selfDriveStatus,
    withDriverSource,
    selfDriveSource,
    withDriver: withDriverPresentation.isAvailable,
    selfDrive: selfDrivePresentation.isAvailable,
    withDriverLabel: withDriverPresentation.label,
    selfDriveLabel: selfDrivePresentation.label,
    withDriverTone: withDriverPresentation.tone,
    selfDriveTone: selfDrivePresentation.tone,
    validId,
    license,
  };
}

export function getBookingEligibility(data) {
  return getBookingEligibilityFromVerification(data);
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
