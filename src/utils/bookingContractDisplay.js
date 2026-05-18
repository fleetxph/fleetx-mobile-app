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

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  const normalized = normalizeLower(value);
  if (!normalized) return false;
  return ["true", "yes", "accepted", "signed", "complete", "completed"].includes(normalized);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMeaningfulText(value) {
  const text = normalizeText(value);
  return Boolean(text && text !== "[object Object]");
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function valueAtPath(source, path) {
  if (!path) return undefined;

  return path.split(".").reduce((current, key) => {
    if (current === undefined || current === null) return undefined;
    return current[key];
  }, source);
}

function objectKeys(value) {
  return isObject(value) ? Object.keys(value) : [];
}

function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

function formatStructuredSection(section) {
  if (typeof section === "string") {
    return normalizeText(section);
  }

  if (!isObject(section)) return "";

  const title = normalizeText(
    firstPresent(section.title, section.heading, section.label, section.name, section.clauseTitle)
  );
  const body = normalizeText(
    firstPresent(
      section.body,
      section.content,
      section.text,
      section.description,
      section.clause,
      section.value
    )
  );

  if (title && body) return `${title}\n${body}`;
  return title || body;
}

function formatStructuredContent(value) {
  if (!value) return "";

  if (typeof value === "string") return normalizeText(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => formatStructuredSection(item))
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  if (!isObject(value)) return "";

  const sectionGroups = [
    value.sections,
    value.clauses,
    value.items,
    value.paragraphs,
    value.terms,
    value.content,
    value.body,
  ];

  for (const group of sectionGroups) {
    const formatted = formatStructuredContent(group);
    if (formatted) {
      const title = normalizeText(firstPresent(value.title, value.name, value.heading));
      return title ? `${title}\n\n${formatted}`.trim() : formatted;
    }
  }

  const directFields = [
    value.html,
    value.contractHtml,
    value.contractText,
    value.text,
    value.content,
    value.body,
    value.description,
    value.value,
    value.template,
    value.terms,
  ];

  for (const fieldValue of directFields) {
    if (typeof fieldValue === "string" && isMeaningfulText(fieldValue)) {
      return normalizeText(fieldValue);
    }

    if (isObject(fieldValue) || Array.isArray(fieldValue)) {
      const formatted = formatStructuredContent(fieldValue);
      if (formatted) return formatted;
    }
  }

  return "";
}

function pickFirstMeaningfulValue(source, paths = []) {
  for (const path of paths) {
    const value = valueAtPath(source, path);
    if (typeof value === "string" && isMeaningfulText(value)) {
      return {
        path,
        value: normalizeText(value),
      };
    }

    if (isObject(value) || Array.isArray(value)) {
      const structured = formatStructuredContent(value);
      if (structured) {
        return {
          path,
          value: structured,
        };
      }
    }
  }

  return {
    path: "",
    value: "",
  };
}

export function getContractAcceptanceState(booking, contractRecord = null) {
  const contract =
    contractRecord?.contract ||
    contractRecord?.data?.contract ||
    contractRecord?.bookingContract ||
    contractRecord?.contractData ||
    booking?.contract ||
    booking?.contractData ||
    {};
  const acceptedAt = firstPresent(
    booking?.contractAcceptedAt,
    booking?.contract?.acceptedAt,
    booking?.contractData?.acceptedAt,
    contract?.acceptedAt,
    contract?.contractAcceptedAt
  );
  const contractStatus = normalizeLower(
    firstPresent(
      booking?.contractStatus,
      booking?.contract?.status,
      booking?.contractData?.status,
      contract?.status,
      contractRecord?.status
    )
  );
  const contractAccepted = Boolean(
    toBoolean(booking?.contractAccepted) ||
      toBoolean(booking?.contract?.accepted) ||
      toBoolean(booking?.contractData?.accepted) ||
      toBoolean(contract?.accepted) ||
      acceptedAt ||
      ["accepted", "signed", "completed"].includes(contractStatus)
  );
  const requiresContract = Boolean(
    toBoolean(booking?.requiresContract) ||
      toBoolean(booking?.contractRequired) ||
      toBoolean(booking?.contract?.required) ||
      toBoolean(booking?.contractData?.required) ||
      toBoolean(contract?.required) ||
      contractAccepted ||
      acceptedAt ||
      contractStatus ||
      normalizeText(contract?.title) ||
      normalizeText(contract?.content) ||
      normalizeText(contract?.html) ||
      normalizeText(contractRecord?.title)
  );

  return {
    requiresContract,
    contractAccepted,
    acceptedAt: normalizeText(acceptedAt),
    contractStatus,
  };
}

export function extractContractContent(payload = {}) {
  const htmlResult = pickFirstMeaningfulValue(payload, [
    "renderedHtml",
    "documentHtml",
    "renderedContract",
    "html",
    "contractHtml",
    "contractTemplate",
    "contractTemplate.html",
    "contractTemplate.content",
    "contractTemplate.body",
    "contractTemplate.template",
    "contractTemplate.contractHtml",
    "template",
    "data.html",
    "data.renderedHtml",
    "data.documentHtml",
    "data.renderedContract",
    "data.contractHtml",
    "data.contractTemplate",
    "data.contractTemplate.html",
    "data.contractTemplate.content",
    "data.contractTemplate.body",
    "data.contractTemplate.contractHtml",
    "data.template",
    "data.contract.html",
    "data.contract.htmlContent",
    "data.contract.contentHtml",
    "data.contract.contractHtml",
    "data.contract.renderedHtml",
    "data.contract.documentHtml",
    "data.template.html",
    "data.template.renderedHtml",
    "data.template.documentHtml",
    "contract.renderedHtml",
    "contract.documentHtml",
    "contract.html",
    "contract.htmlContent",
    "contract.contentHtml",
    "contract.contractHtml",
    "template.html",
    "template.renderedHtml",
    "template.documentHtml",
    "bookingContract.html",
    "contractData.html",
  ]);
  const textResult = pickFirstMeaningfulValue(payload, [
    "contractText",
    "content",
    "body",
    "contractTemplate",
    "contractTemplate.content",
    "contractTemplate.body",
    "contractTemplate.template",
    "contractTemplate.terms",
    "contractTemplate.text",
    "contractTemplate.contractText",
    "contractTemplate.sections",
    "contractTemplate.clauses",
    "template",
    "terms",
    "agreement",
    "data.contractText",
    "data.content",
    "data.body",
    "data.contractTemplate",
    "data.contractTemplate.content",
    "data.contractTemplate.body",
    "data.contractTemplate.terms",
    "data.contractTemplate.text",
    "data.contractTemplate.sections",
    "data.contractTemplate.clauses",
    "data.template",
    "data.terms",
    "data.agreement",
    "data.contract.content",
    "data.contract.text",
    "data.contract.body",
    "data.contract.template",
    "data.contract.terms",
    "data.contract.agreement",
    "data.template.content",
    "data.template.body",
    "data.template.text",
    "data.template.terms",
    "contract.content",
    "contract.text",
    "contract.body",
    "contract.template",
    "contract.terms",
    "contract.agreement",
    "template.content",
    "template.body",
    "template.text",
    "template.terms",
    "bookingContract.content",
    "contractData.content",
  ]);
  const contractObject = firstPresent(payload?.contract, payload?.data?.contract, payload?.bookingContract);
  const templateObject = firstPresent(
    payload?.contractTemplate,
    payload?.data?.contractTemplate,
    payload?.template,
    payload?.data?.template
  );
  const title = normalizeText(
    firstPresent(
      valueAtPath(payload, "contractTemplate.title"),
      valueAtPath(payload, "data.contractTemplate.title"),
      valueAtPath(payload, "contract.title"),
      valueAtPath(payload, "template.title"),
      payload?.title,
      payload?.name,
      valueAtPath(payload, "data.title"),
      "Rental Contract"
    )
  );
  const pdfUrl = normalizeText(
    firstPresent(
      valueAtPath(payload, "contract.pdfUrl"),
      valueAtPath(payload, "contract.pdf"),
      valueAtPath(payload, "contract.documentUrl"),
      valueAtPath(payload, "contract.fileUrl"),
      payload?.pdfUrl,
      payload?.documentUrl,
      payload?.data?.pdfUrl,
      payload?.data?.documentUrl
    )
  );
  const acceptedAt = normalizeText(
    firstPresent(
      valueAtPath(payload, "contract.acceptedAt"),
      payload?.acceptedAt,
      valueAtPath(payload, "contract.contractAcceptedAt")
    )
  );
  const htmlContent = htmlResult.value;
  const textContent = textResult.value;
  const content = normalizeText(htmlContent || textContent);

  return {
    title,
    htmlContent: looksLikeHtml(htmlContent) ? htmlContent : "",
    textContent: looksLikeHtml(textContent) ? "" : textContent,
    content,
    pdfUrl,
    acceptedAt,
    raw: contractObject || templateObject || payload,
    sourcePath: htmlContent ? htmlResult.path : textResult.path,
  };
}

export function getContractContentDiagnostics(payload = {}) {
  const extracted = extractContractContent(payload);
  const contractTemplate = firstPresent(payload?.contractTemplate, payload?.data?.contractTemplate);
  const extractedFromContractTemplate =
    extracted.sourcePath.startsWith("contractTemplate") ||
    extracted.sourcePath.startsWith("data.contractTemplate");
  const contractTemplateContent =
    isObject(contractTemplate) || Array.isArray(contractTemplate)
      ? formatStructuredContent(contractTemplate)
      : typeof contractTemplate === "string" && isMeaningfulText(contractTemplate)
      ? normalizeText(contractTemplate)
      : "";
  const hasContractTemplate = Boolean(
    contractTemplate &&
      (Boolean(contractTemplateContent) || (Boolean(extracted.content) && extractedFromContractTemplate))
  );
  const templateType = Array.isArray(contractTemplate)
    ? "array"
    : typeof contractTemplate === "string"
    ? "string"
    : isObject(contractTemplate)
    ? "object"
    : "none";

  return {
    dataKeys: objectKeys(payload),
    nestedKeys: {
      data: objectKeys(payload?.data),
      contract: objectKeys(payload?.contract || payload?.data?.contract),
      template: objectKeys(
        payload?.contractTemplate ||
          payload?.data?.contractTemplate ||
          payload?.template ||
          payload?.data?.template
      ),
    },
    hasHtml: Boolean(extracted.htmlContent),
    hasText: Boolean(extracted.textContent),
    hasTemplate: Boolean(
      hasContractTemplate ||
        payload?.template ||
        payload?.data?.template ||
        (extracted.content && extractedFromContractTemplate)
    ),
    hasContractTemplate,
    hasContractObject: Boolean(payload?.contract || payload?.data?.contract),
    message: normalizeText(firstPresent(payload?.message, payload?.data?.message)).slice(0, 80),
    sourcePath: extracted.sourcePath,
    templateType,
    extractedContentLength: extracted.content.length,
  };
}

export function htmlToReadableText(value) {
  const raw = normalizeText(value);
  if (!raw) return "";

  if (!looksLikeHtml(raw)) {
    return formatStructuredContent(raw) || raw;
  }

  const withLineBreaks = raw
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|section|article)>/gi, "\n")
    .replace(/<(li|tr)[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/ul>|<\/ol>|<\/table>/gi, "\n");
  const stripped = withLineBreaks.replace(/<[^>]+>/g, " ");
  const decoded = decodeEntities(stripped);

  return decoded
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function formatReadableDate(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatReadableMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "Not specified";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function replacePlaceholders(template, fieldMap) {
  const source = String(template || "");
  const placeholderCountBefore = (source.match(/{{\s*[\w.]+\s*}}/g) || []).length;

  let rendered = source.replace(/{{\s*([\w.]+)\s*}}/g, (_, rawKey) => {
    const normalizedKey = String(rawKey || "").trim();
    return normalizeText(fieldMap[normalizedKey]) || "Not specified";
  });

  rendered = rendered.replace(/{{\s*[\w.]+\s*}}/g, "Not specified");
  const placeholderCountAfter = (rendered.match(/{{\s*[\w.]+\s*}}/g) || []).length;

  return {
    rendered,
    placeholderCountBefore,
    placeholderCountAfter,
  };
}

function valueOrEmpty(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return normalizeText(value);
  return String(value).trim();
}

function isPresentValue(value) {
  return Boolean(valueOrEmpty(value));
}

function joinVehicleParts(...values) {
  const parts = values.map(valueOrEmpty).filter(Boolean);
  return parts.join(" ").trim();
}

function pickFirstPresentValue(...values) {
  for (const value of values) {
    if (isPresentValue(value)) {
      return valueOrEmpty(value);
    }
  }

  return "";
}

function normalizeRentalTypeValue(value) {
  const raw = valueOrEmpty(value);
  if (!raw) return "";

  const collapsed = raw.replace(/[\s_-]+/g, "").toLowerCase();
  if (collapsed === "selfdrive") return "Self Drive";
  if (collapsed === "withdriver") return "With Driver";

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveVehicleName(booking = {}) {
  const vehicle = booking?.vehicle || {};
  const vehicleSnapshot = booking?.vehicleSnapshot || {};
  const selectedVehicle = booking?.selectedVehicle || {};
  const car = booking?.car || {};
  const vehicleDetails = booking?.vehicleDetails || {};

  return pickFirstPresentValue(
    vehicle?.name,
    vehicle?.vehicleName,
    vehicle?.title,
    joinVehicleParts(vehicle?.make, vehicle?.model, vehicle?.year),
    joinVehicleParts(vehicle?.brand, vehicle?.model, vehicle?.year),
    vehicleSnapshot?.name,
    joinVehicleParts(vehicleSnapshot?.make, vehicleSnapshot?.model, vehicleSnapshot?.year),
    selectedVehicle?.name,
    car?.name,
    booking?.vehicleName,
    booking?.carName,
    booking?.vehicleTitle,
    booking?.vehicleModel,
    vehicleDetails?.name,
    joinVehicleParts(vehicleDetails?.make, vehicleDetails?.model, vehicleDetails?.year),
    booking?.vehicleLabel
  );
}

function resolvePlateNumber(booking = {}) {
  const vehicle = booking?.vehicle || {};
  const vehicleSnapshot = booking?.vehicleSnapshot || {};
  const selectedVehicle = booking?.selectedVehicle || {};
  const car = booking?.car || {};
  const vehicleDetails = booking?.vehicleDetails || {};

  return pickFirstPresentValue(
    vehicle?.plateNumber,
    vehicle?.plateNo,
    vehicle?.plate,
    vehicle?.licensePlate,
    vehicle?.registrationNumber,
    vehicleSnapshot?.plateNumber,
    selectedVehicle?.plateNumber,
    car?.plateNumber,
    booking?.plateNumber,
    booking?.plateNo,
    booking?.plate,
    booking?.vehiclePlate,
    vehicleDetails?.plateNumber
  );
}

function resolveRentalType(booking = {}) {
  return normalizeRentalTypeValue(
    pickFirstPresentValue(
      booking?.tripType,
      booking?.rentalType,
      booking?.bookingType,
      booking?.serviceType,
      booking?.travelType,
      booking?.rentalMode,
      booking?.trip?.type,
      booking?.details?.tripType,
      booking?.tripTypeLabel
    )
  );
}

export function buildContractRenderFields(booking = {}) {
  const vehicle =
    booking?.vehicle ||
    booking?.vehicleData ||
    booking?.vehicleDetails ||
    booking?.vehicleSnapshot ||
    booking?.selectedVehicle ||
    booking?.car ||
    {};
  const user = booking?.user || booking?.customer || booking?.client || {};
  const vehicleName = resolveVehicleName(booking) || "Not specified";
  const customerName =
    user?.fullName ||
    user?.name ||
    booking?.fullName ||
    booking?.customerFullName ||
    booking?.customerName ||
    booking?.customer?.name ||
    booking?.clientName ||
    booking?.name ||
    "Customer";
  const bookingReference =
    booking?.bookingReference || booking?.reference || booking?.bookingCode || booking?.referenceNo || "Not specified";
  const amountDue =
    booking?.amountDue ??
    booking?.amountToPay ??
    booking?.invoice?.amountDue ??
    booking?.invoiceAmount ??
    booking?.downPayment ??
    0;
  const totalAmount =
    booking?.totalAmount ??
    booking?.totalPrice ??
    booking?.invoice?.totalAmount ??
    booking?.invoice?.amount ??
    0;
  const rentalType = resolveRentalType(booking) || "Not specified";
  const pickupLocation =
    booking?.pickupLocation ||
    booking?.pickupAddress ||
    booking?.originAddress ||
    booking?.origin ||
    booking?.pickup?.address ||
    booking?.pickup?.name ||
    "Not specified";
  const destination =
    booking?.destination ||
    booking?.dropoffLocation ||
    booking?.dropoffAddress ||
    booking?.returnLocation ||
    booking?.destinationAddress ||
    booking?.dropoff?.address ||
    booking?.dropoff?.name ||
    "Not specified";
  const paymentMethod =
    booking?.invoice?.paymentMethod ||
    booking?.paymentMethodName ||
    booking?.selectedPaymentMethodName ||
    booking?.paymentMethod ||
    booking?.paymentChannel ||
    "Not specified";
  const paymentOption =
    booking?.invoice?.paymentOption || booking?.paymentOption || booking?.paymentPlan || "Not specified";

  return {
    customerName,
    renterName: customerName,
    bookingReference,
    vehicleName,
    vehicle: vehicleName,
    plateNumber: resolvePlateNumber(booking) || "Not specified",
    rentalType,
    tripType: rentalType,
    startDate: formatReadableDate(booking?.startDate || booking?.pickupDate || booking?.fromDate),
    endDate: formatReadableDate(booking?.endDate || booking?.returnDate || booking?.toDate),
    pickupLocation,
    destination,
    paymentMethod,
    paymentOption,
    amountDue: formatReadableMoney(amountDue),
    totalAmount: formatReadableMoney(totalAmount),
    totalPrice: formatReadableMoney(totalAmount),
    invoiceReference:
      booking?.invoiceReference || booking?.invoiceNumber || booking?.invoice?.invoiceNumber || "Not specified",
    returnArrangement: booking?.returnArrangement || booking?.returnArrangementType || "Not specified",
    companyName: "FleetX Transport Services",
    effectiveDate: formatReadableDate(new Date().toISOString()),
    contractVersion: booking?.contractVersion || booking?.contract?.version || "Not specified",
  };
}

export function renderContractContentWithBooking(payload = {}, booking = {}) {
  const extracted = extractContractContent(payload);
  const renderFields = buildContractRenderFields(booking);
  const rawContent = extracted.htmlContent || extracted.textContent || extracted.content || "";
  const replacement = replacePlaceholders(rawContent, renderFields);
  const content = normalizeText(replacement.rendered);
  const sourcePath = extracted.sourcePath || "";
  const usedTemplateFallback =
    sourcePath.startsWith("contractTemplate") || sourcePath.startsWith("data.contractTemplate");

  return {
    ...extracted,
    htmlContent: extracted.htmlContent ? content : "",
    textContent: extracted.htmlContent ? "" : content,
    content,
    renderFields,
    placeholderCountBefore: replacement.placeholderCountBefore,
    placeholderCountAfter: replacement.placeholderCountAfter,
    usedTemplateFallback,
    bookingSpecificLoaded: Boolean(content && !usedTemplateFallback),
  };
}
