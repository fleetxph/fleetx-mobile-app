function normalizeText(value) {
  return String(value || "").trim();
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

const EXPIRY_PATHS = {
  validId: [
    "validIdExpiryDate",
    "validIdExpiresAt",
    "idExpiryDate",
    "idExpiresAt",
    "verification.validId.expiryDate",
    "verification.validId.expiresAt",
    "documents.validId.expiryDate",
    "documents.validId.expiresAt",
  ],
  license: [
    "licenseExpiryDate",
    "licenseExpiresAt",
    "driverLicenseExpiryDate",
    "driverLicenseExpiresAt",
    "verification.license.expiryDate",
    "verification.license.expiresAt",
    "verification.driverLicense.expiryDate",
    "verification.driverLicense.expiresAt",
    "documents.driverLicense.expiryDate",
    "documents.driverLicense.expiresAt",
  ],
};

const RENEWAL_FLAG_PATHS = {
  validId: [
    "validIdRenewalAllowed",
    "validIdCanRenew",
    "validIdRequiresUpdate",
    "validIdNeedsUpdate",
    "validIdExpired",
    "verification.validId.renewalAllowed",
    "verification.validId.canRenew",
    "verification.validId.requiresUpdate",
    "verification.validId.needsUpdate",
    "verification.validId.expired",
    "documents.validId.renewalAllowed",
    "documents.validId.canRenew",
  ],
  license: [
    "licenseRenewalAllowed",
    "licenseCanRenew",
    "licenseRequiresUpdate",
    "licenseNeedsUpdate",
    "licenseExpired",
    "driverLicenseRenewalAllowed",
    "driverLicenseCanRenew",
    "driverLicenseRequiresUpdate",
    "driverLicenseNeedsUpdate",
    "driverLicenseExpired",
    "verification.license.renewalAllowed",
    "verification.license.canRenew",
    "verification.license.requiresUpdate",
    "verification.license.needsUpdate",
    "verification.license.expired",
    "verification.driverLicense.renewalAllowed",
    "verification.driverLicense.canRenew",
    "verification.driverLicense.requiresUpdate",
    "verification.driverLicense.needsUpdate",
    "verification.driverLicense.expired",
    "documents.driverLicense.renewalAllowed",
    "documents.driverLicense.canRenew",
  ],
};

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function getDocumentExpiryDate(data, group) {
  return normalizeText(pickFirstValue(data, EXPIRY_PATHS[group] || []));
}

export function getDaysUntilExpiry(expiryDate) {
  const date = toDate(expiryDate);
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(date);
  expiry.setHours(0, 0, 0, 0);

  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isExpired(expiryDate) {
  const daysRemaining = getDaysUntilExpiry(expiryDate);
  return daysRemaining !== null && daysRemaining < 0;
}

export function isNearExpiry(expiryDate) {
  const daysRemaining = getDaysUntilExpiry(expiryDate);
  return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30;
}

export function getExpiryStatus(expiryDate) {
  if (!expiryDate) return "unknown";
  if (isExpired(expiryDate)) return "expired";
  if (isNearExpiry(expiryDate)) return "expiring_soon";
  return "valid";
}

export function getExpiryLabel(expiryDate) {
  const status = getExpiryStatus(expiryDate);
  if (status === "expired") return "Expired";
  if (status === "expiring_soon") return "Expiring soon";
  if (status === "valid") return "Valid";
  return "No expiry shown";
}

export function formatExpiryDate(expiryDate) {
  const date = toDate(expiryDate);
  if (!date) return "No expiry shown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getDocumentRenewalMeta(data, group) {
  const expiryDate = getDocumentExpiryDate(data, group);
  const daysRemaining = getDaysUntilExpiry(expiryDate);
  const expiryStatus = getExpiryStatus(expiryDate);
  const rawFlags = RENEWAL_FLAG_PATHS[group] || [];
  const matchedFlagValues = rawFlags
    .map((path) => valueAtPath(data, path))
    .filter((value) => value !== undefined && value !== null && value !== "");
  const backendRequiresUpdate = matchedFlagValues.some((value) => value === true);
  const renewalAllowed = matchedFlagValues.some((value) => value === true);

  return {
    expiryDate,
    daysRemaining,
    expiryStatus,
    expiryLabel: getExpiryLabel(expiryDate),
    backendRequiresUpdate,
    renewalAllowed,
    isExpired: expiryStatus === "expired",
    isNearExpiry: expiryStatus === "expiring_soon",
  };
}
