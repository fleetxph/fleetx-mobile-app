function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeProviderKey(value) {
  return normalizeLower(value).replace(/[\s._-]+/g, "");
}

function toCanonicalDisplayName(name) {
  const normalized = normalizeProviderKey(name);

  if (normalized === "gcash") return "GCash";

  return normalizeText(name);
}

function getAccountSignature(method = {}) {
  return normalizeLower(
    method?.accountNumber ||
      method?.accountNo ||
      method?.eWalletNumber ||
      method?.mobileNumber ||
      method?.gcashNumber ||
      method?.number
  );
}

function getCategorySignature(method = {}) {
  return normalizeLower(method?.category || method?.type || method?.method || method?.channel);
}

function getMethodNameSignature(method = {}) {
  return normalizeLower(method?.name || method?.label || method?.method);
}

function getProviderSignature(method = {}) {
  return normalizeProviderKey(method?.name || method?.label || method?.method);
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

function getNestedPaymentDetails(method = {}) {
  return (
    method?.paymentDetails ||
    method?.paymentInstruction ||
    method?.paymentInstructions ||
    method?.config ||
    method?.settings ||
    {}
  );
}

export function getPaymentMethodQrValue(method = {}) {
  const paymentDetails = getNestedPaymentDetails(method);
  const fieldGroups = [
    [
      "qr",
      "qrUrl",
      "qrCode",
      "qrCodeUrl",
      "qrImage",
      "qrImageUrl",
      "imageUrl",
      "paymentQr",
      "paymentQrUrl",
      "paymentQRCode",
    ],
  ];

  return (
    valueFromSource(method, fieldGroups[0]) ||
    valueFromSource(paymentDetails, fieldGroups[0]) ||
    ""
  );
}

function hasPaymentMethodQr(method = {}) {
  return Boolean(normalizeText(getPaymentMethodQrValue(method)));
}

function getPaymentMethodAccountValue(method = {}) {
  const paymentDetails = getNestedPaymentDetails(method);

  return (
    valueFromSource(method, [
      "accountNumber",
      "accountNo",
      "eWalletNumber",
      "mobileNumber",
      "gcashNumber",
      "number",
    ]) ||
    valueFromSource(paymentDetails, [
      "accountNumber",
      "accountNo",
      "eWalletNumber",
      "mobileNumber",
      "gcashNumber",
      "number",
    ]) ||
    ""
  );
}

function getPaymentMethodAccountName(method = {}) {
  const paymentDetails = getNestedPaymentDetails(method);

  return (
    valueFromSource(method, ["accountName", "accountHolder", "holderName"]) ||
    valueFromSource(paymentDetails, ["accountName", "accountHolder", "holderName"]) ||
    ""
  );
}

function isBackendBackedMethod(method = {}) {
  return Boolean(
    normalizeText(method?._id || method?.id) &&
      !toBooleanLike(method?.isFallback) &&
      !toBooleanLike(method?.isDummy)
  );
}

function toBooleanLike(value) {
  const normalized = normalizeLower(value);
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function isMethodEnabled(method = {}) {
  const enabledValue = method?.isActive ?? method?.active ?? method?.enabled ?? method?.status;
  const normalized = normalizeLower(enabledValue);

  if (typeof enabledValue === "boolean") return enabledValue;
  if (!normalized) return true;
  if (["inactive", "disabled", "false", "0", "archived"].includes(normalized)) return false;
  return true;
}

function getCompletenessScore(method = {}) {
  return [
    method?._id || method?.id,
    method?.name || method?.label || method?.method,
    method?.category || method?.type || method?.channel,
    getPaymentMethodAccountName(method),
    getPaymentMethodAccountValue(method),
    method?.instructions || method?.description,
    getPaymentMethodQrValue(method),
  ].filter((value) => normalizeText(value)).length;
}

export function getPaymentMethodSelectionKey(method = {}) {
  const id = normalizeText(method?._id || method?.id);
  if (id) return id;

  return [
    getProviderSignature(method),
    getCategorySignature(method),
    getAccountSignature(method),
  ]
    .filter(Boolean)
    .join("|");
}

export function formatPaymentMethodName(name) {
  return toCanonicalDisplayName(name);
}

export function dedupePaymentMethods(methods = []) {
  const providerMap = new Map();
  const order = [];

  methods.forEach((method) => {
    if (!method || typeof method !== "object") return;

    const providerKey = getProviderSignature(method);
    const dedupeKey = providerKey || getPaymentMethodSelectionKey(method);

    if (!dedupeKey) return;

    const normalizedMethod = {
      ...method,
      name: toCanonicalDisplayName(method?.name || method?.label || method?.method),
    };

    if (!providerMap.has(dedupeKey)) {
      providerMap.set(dedupeKey, normalizedMethod);
      order.push(dedupeKey);
      return;
    }

    const currentBest = providerMap.get(dedupeKey);
    const ranking = (method) => ({
      hasQr: hasPaymentMethodQr(method) ? 1 : 0,
      hasAccount: normalizeText(getPaymentMethodAccountValue(method)) ? 1 : 0,
      hasAccountName: normalizeText(getPaymentMethodAccountName(method)) ? 1 : 0,
      isBackend: isBackendBackedMethod(method) ? 1 : 0,
      isEnabled: isMethodEnabled(method) ? 1 : 0,
      completeness: getCompletenessScore(method),
    });
    const currentRank = ranking(currentBest);
    const nextRank = ranking(normalizedMethod);
    const shouldReplace =
      nextRank.hasQr > currentRank.hasQr ||
      (nextRank.hasQr === currentRank.hasQr && nextRank.hasAccount > currentRank.hasAccount) ||
      (nextRank.hasQr === currentRank.hasQr &&
        nextRank.hasAccount === currentRank.hasAccount &&
        nextRank.hasAccountName > currentRank.hasAccountName) ||
      (nextRank.hasQr === currentRank.hasQr &&
        nextRank.hasAccount === currentRank.hasAccount &&
        nextRank.hasAccountName === currentRank.hasAccountName &&
        nextRank.isBackend > currentRank.isBackend) ||
      (nextRank.hasQr === currentRank.hasQr &&
        nextRank.hasAccount === currentRank.hasAccount &&
        nextRank.hasAccountName === currentRank.hasAccountName &&
        nextRank.isBackend === currentRank.isBackend &&
        nextRank.isEnabled > currentRank.isEnabled) ||
      (nextRank.hasQr === currentRank.hasQr &&
        nextRank.hasAccount === currentRank.hasAccount &&
        nextRank.hasAccountName === currentRank.hasAccountName &&
        nextRank.isBackend === currentRank.isBackend &&
        nextRank.isEnabled === currentRank.isEnabled &&
        nextRank.completeness > currentRank.completeness);

    if (shouldReplace) {
      providerMap.set(dedupeKey, normalizedMethod);
    }
  });

  const deduped = order.map((key) => {
    const method = providerMap.get(key);
    return {
      ...method,
      selectionKey: getPaymentMethodSelectionKey(method),
    };
  });

  if (__DEV__) {
    console.log("[PaymentMethods][resolve]", {
      source: "api",
      originalCount: Array.isArray(methods) ? methods.length : 0,
      finalCount: deduped.length,
      removedDuplicates: Math.max(0, (Array.isArray(methods) ? methods.length : 0) - deduped.length),
      preferredWithQrCount: deduped.filter((method) => hasPaymentMethodQr(method)).length,
    });
  }

  return deduped;
}
