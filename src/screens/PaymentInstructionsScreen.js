import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_ORIGIN, BASE_URL } from "../api/api";
import {
  acceptBookingContract,
  getBookingContract,
  getBookingContractPdfUrl,
  getClientInvoiceUrl,
  getContractTemplate,
  getPublicPaymentMethods,
  submitPaymentProof,
} from "../api/clientApi";
import SuccessInfoModal from "../components/SuccessInfoModal";
import { styles } from "../styles/paymentInstructionsStyle";
import {
  formatBookingDateTime,
  formatBookingPrice,
  getInvoicePdfSource,
  getReferenceNo,
} from "../utils/bookingDocuments";
import {
  extractContractContent,
  getContractContentDiagnostics,
  getContractAcceptanceState,
  htmlToReadableText,
} from "../utils/bookingContractDisplay";
import { getBookingStatusLabel, getBookingStatusMeta } from "../utils/bookingStatusDisplay";
import { resolveImageUrl } from "../utils/imageUrl";
import { dedupePaymentMethods, getPaymentMethodSelectionKey } from "../utils/paymentMethods";
import { openPdf, showPdfError } from "../utils/pdfUtils";

function valueOrFallback(value, fallback = "Not available") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function getBookingId(booking) {
  return booking?._id || booking?.id || booking?.bookingId || "";
}

function normalizeMethod(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function toBase64DataUri(asset) {
  if (!asset?.base64) return "";
  const mimeType = asset.mimeType || "image/jpeg";
  return `data:${mimeType};base64,${asset.base64}`;
}

function getPaymentStatusDisplay(booking) {
  const paymentStatus = String(booking?.paymentStatus || "").toLowerCase();
  const status = String(booking?.status || "").toLowerCase();

  if (
    ["rejected", "reupload_required"].includes(paymentStatus) ||
    status === "payment_rejected"
  ) {
    return "Awaiting Payment";
  }

  return getBookingStatusLabel(booking);
}

function getPaymentProofEligibility(booking) {
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.paymentStatus || "").toLowerCase();
  const statusMeta = getBookingStatusMeta(booking);
  const hasInvoiceOrPaymentDetails = Boolean(
    booking?.invoiceReference ||
      booking?.invoiceNumber ||
      booking?.invoice?.invoiceNumber ||
      booking?.invoice?.reference ||
      booking?.amountDue ||
      booking?.amountToPay ||
      booking?.invoiceAmount ||
      booking?.paymentMethod ||
      booking?.paymentOption ||
      booking?.paymentInstructions ||
      booking?.paymentDetails
  );

  const isUnderReview =
    ["submitted", "payment_submitted", "under_review", "pending"].includes(paymentStatus) ||
    statusMeta.key === "under_review";
  const isLocked =
    ["verified", "fully_paid", "downpayment_paid"].includes(paymentStatus) ||
    ["confirmed", "completed", "cancelled"].includes(statusMeta.key);
  const isEligible =
    !isUnderReview &&
    !isLocked &&
    (statusMeta.key === "awaiting_payment" ||
      (status === "approved" && hasInvoiceOrPaymentDetails) ||
      ["invoice_issued", "pending_payment", "payment_pending", "rejected", "reupload_required"].includes(
        paymentStatus
      ));

  return {
    isEligible,
    isUnderReview,
    isLocked,
    hasInvoiceOrPaymentDetails,
  };
}

function getCountdownText(deadline) {
  if (!deadline) return "No deadline set";
  const value = new Date(deadline);
  if (Number.isNaN(value.getTime())) return "No deadline set";

  const diff = value.getTime() - Date.now();
  if (diff <= 0) return "Expired";

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${Math.max(minutes, 1)}m remaining`;
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

function resolveAssetUrl(pathOrUrl) {
  const resolved = resolveImageUrl(pathOrUrl);
  if (resolved) return resolved;

  const rawValue = String(pathOrUrl || "").trim();
  if (!rawValue) return null;

  if (/^https?:\/\//i.test(rawValue)) {
    try {
      const url = new URL(rawValue);
      if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) {
        const backendUrl = new URL(BACKEND_ORIGIN);
        url.protocol = backendUrl.protocol;
        url.hostname = backendUrl.hostname;
        url.port = backendUrl.port;
        return url.toString();
      }
      return rawValue;
    } catch {
      return null;
    }
  }

  const backendOrigin = BACKEND_ORIGIN.replace(/\/+$/, "");
  const apiBaseUrl = BASE_URL.replace(/\/+$/, "");
  const normalized = rawValue.replace(/\\/g, "/");

  if (normalized.startsWith("/api/")) {
    return `${backendOrigin}${normalized}`;
  }

  if (normalized.startsWith("api/")) {
    return `${backendOrigin}/${normalized}`;
  }

  if (normalized.startsWith("/uploads/")) {
    return `${backendOrigin}${normalized}`;
  }

  if (normalized.startsWith("uploads/")) {
    return `${backendOrigin}/${normalized}`;
  }

  if (normalized.startsWith("/")) {
    return `${backendOrigin}${normalized}`;
  }

  return `${apiBaseUrl}/${normalized.replace(/^\/+/, "")}`;
}

function getPaymentQrSource(booking, selectedMethod) {
  const invoice = booking?.invoice || {};
  const invoiceData = booking?.invoiceData || {};
  const bookingPaymentMethod =
    typeof booking?.paymentMethod === "object"
      ? booking.paymentMethod
      : booking?.selectedPaymentMethod || booking?.selectedPaymentMethodData || {};
  const paymentDetails =
    booking?.paymentDetails ||
    booking?.paymentInstruction ||
    booking?.paymentInstructions ||
    invoice?.paymentDetails ||
    invoiceData?.paymentDetails ||
    invoice?.paymentInstruction ||
    invoiceData?.paymentInstruction ||
    invoice?.paymentInstructions ||
    invoiceData?.paymentInstructions ||
    selectedMethod?.paymentDetails ||
    selectedMethod?.paymentInstruction ||
    {};

  const methodConfig =
    selectedMethod?.config ||
    selectedMethod?.settings ||
    selectedMethod?.paymentDetails ||
    selectedMethod?.paymentInstruction ||
    {};
  const qrFieldGroups = [
    {
      source: "paymentDetails",
      target: paymentDetails,
      fields: [
        "qr",
        "qrUrl",
        "qrImage",
        "qrImageUrl",
        "qrCode",
        "qrCodeUrl",
        "paymentQr",
        "paymentQrUrl",
        "paymentQRCode",
        "image",
        "imageUrl",
      ],
    },
    {
      source: "selectedPaymentMethod",
      target: selectedMethod,
      fields: [
        "qr",
        "qrUrl",
        "qrImage",
        "qrImageUrl",
        "qrCode",
        "qrCodeUrl",
        "paymentQr",
        "paymentQrUrl",
        "paymentQRCode",
        "image",
        "imageUrl",
      ],
    },
    {
      source: "selectedPaymentMethod.config",
      target: methodConfig,
      fields: [
        "qr",
        "qrUrl",
        "qrImage",
        "qrImageUrl",
        "qrCode",
        "qrCodeUrl",
        "paymentQr",
        "paymentQrUrl",
        "paymentQRCode",
        "image",
        "imageUrl",
      ],
    },
    {
      source: "booking.paymentMethod",
      target: bookingPaymentMethod,
      fields: [
        "qr",
        "qrUrl",
        "qrImage",
        "qrImageUrl",
        "qrCode",
        "qrCodeUrl",
        "paymentQr",
        "paymentQrUrl",
        "paymentQRCode",
        "image",
        "imageUrl",
      ],
    },
    {
      source: "booking",
      target: booking,
      fields: [
        "paymentQr",
        "paymentQrUrl",
        "paymentQRCode",
        "qr",
        "qrUrl",
        "qrImage",
        "qrImageUrl",
        "qrCode",
        "qrCodeUrl",
      ],
    },
    {
      source: "invoice",
      target: invoice,
      fields: [
        "paymentQr",
        "paymentQrUrl",
        "paymentQRCode",
        "qr",
        "qrUrl",
        "qrImage",
        "qrImageUrl",
        "qrCode",
        "qrCodeUrl",
      ],
    },
    {
      source: "invoiceData",
      target: invoiceData,
      fields: [
        "paymentQr",
        "paymentQrUrl",
        "paymentQRCode",
        "qr",
        "qrUrl",
        "qrImage",
        "qrImageUrl",
        "qrCode",
        "qrCodeUrl",
      ],
    },
  ];

  let checkedFieldsCount = 0;

  for (const group of qrFieldGroups) {
    checkedFieldsCount += group.fields.length;
    const value = valueFromSource(group.target, group.fields);
    if (value) {
      return {
        qrSource: group.source,
        qrValue: value,
        checkedFieldsCount,
      };
    }
  }

  return {
    qrSource: "",
    qrValue: "",
    checkedFieldsCount,
  };
}

function getPaymentMethodLabel(booking, paymentMethod) {
  return (
    paymentMethod?.name ||
    booking?.selectedPaymentMethodName ||
    booking?.paymentMethod ||
    booking?.paymentChannel ||
    "Not available"
  );
}

function getAccountName(booking, paymentMethod) {
  return (
    paymentMethod?.accountName ||
    paymentMethod?.accountHolder ||
    booking?.accountName ||
    booking?.paymentAccountName ||
    ""
  );
}

function getAccountNumber(booking, paymentMethod) {
  return (
    paymentMethod?.accountNumber ||
    paymentMethod?.accountNo ||
    booking?.accountNumber ||
    booking?.paymentAccountNumber ||
    ""
  );
}

function getAmountToPay(booking) {
  const rawAmount =
    booking?.amountDue ??
    booking?.amountToPay ??
    booking?.downPayment ??
    booking?.invoiceAmount ??
    booking?.invoice?.amountDue ??
    booking?.invoice?.amountToPay ??
    booking?.invoice?.amount ??
    booking?.totalPrice ??
    0;

  return Number(rawAmount || 0);
}

function formatPaymentOption(option) {
  if (option === "down_payment_50") return "50% Down Payment";
  if (option === "full_payment") return "Full Payment";
  return valueOrFallback(option, "Not selected");
}

function getContractFriendlyError(type) {
  if (type === "accept") return "Unable to accept contract. Please try again.";
  if (type === "load") return "Unable to load contract. Please try again.";
  return "Contract is not available yet.";
}

function getContractEndpoint(bookingId) {
  return bookingId ? `/api/client/bookings/${bookingId}/contract` : "/api/client/bookings/:id/contract";
}

function getFriendlyContractErrorMessage(error, fallbackMessage) {
  const status = Number(error?.response?.status || 0);
  const responseData = error?.response?.data || {};
  const backendMessage = String(
    responseData?.message ||
      responseData?.error ||
      responseData?.detail ||
      responseData?.data?.message ||
      ""
  ).trim();

  if (status === 404) return "Contract is not available yet.";
  if (status === 401 || status === 403) return "Please sign in again to view the contract.";
  if (status === 400) return backendMessage || fallbackMessage || getContractFriendlyError("load");
  if (!error?.response) return "Unable to connect. Please try again.";
  return backendMessage || fallbackMessage || getContractFriendlyError("load");
}

function shouldShowPendingContractReview(message) {
  return /contract.*not accepted|not accepted yet|review and accept|accept the rental contract/i.test(
    String(message || "")
  );
}

function getContractPdfPendingMessage() {
  return "Contract PDF will be available after you accept the rental contract.";
}

function getContractTemplateNotice() {
  return "This is the current rental contract template. Booking-specific PDF will be available after accepting the contract.";
}

function getHeaderValue(headers, key) {
  if (!headers) return "";

  const matchedKey = Object.keys(headers).find(
    (headerKey) => String(headerKey).toLowerCase() === String(key || "").toLowerCase()
  );

  return matchedKey ? String(headers[matchedKey] || "") : "";
}

function logBookingDocsError(type, error) {
  if (!__DEV__) return;

  console.log("[BookingDocs][error]", {
    type,
    reachedResponse: Boolean(error?.response),
    status: error?.response?.status || null,
    message: error?.message || "Unknown error",
    responseData: error?.response?.data || null,
  });
}

export default function PaymentInstructionsScreen({ navigation, route }) {
  const [booking, setBooking] = useState(route?.params?.booking || {});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [paymentAsset, setPaymentAsset] = useState(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [qrPreviewVisible, setQrPreviewVisible] = useState(false);
  const [proofSuccessVisible, setProofSuccessVisible] = useState(false);
  const [proofError, setProofError] = useState("");
  const [contractModalVisible, setContractModalVisible] = useState(false);
  const [contractRecord, setContractRecord] = useState(null);
  const [contractTemplate, setContractTemplate] = useState(null);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractAccepting, setContractAccepting] = useState(false);
  const [contractError, setContractError] = useState("");
  const [contractAcceptError, setContractAcceptError] = useState("");
  const [contractNotice, setContractNotice] = useState("");
  const [contractAgreementChecked, setContractAgreementChecked] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [qrImageLoadFailed, setQrImageLoadFailed] = useState(false);
  const [countdownText, setCountdownText] = useState(
    getCountdownText(route?.params?.booking?.paymentDueAt || route?.params?.booking?.paymentDeadline)
  );

  useEffect(() => {
    let isMounted = true;

    const loadPaymentMethods = async () => {
      try {
        setLoadingMethods(true);
        const res = await getPublicPaymentMethods();
        if (!isMounted) return;
        setPaymentMethods(
          dedupePaymentMethods(Array.isArray(res?.paymentMethods) ? res.paymentMethods : [])
        );
      } catch (error) {
        console.log("Load payment methods error:", error?.response?.data || error?.message || error);
        if (isMounted) {
          setPaymentMethods([]);
        }
      } finally {
        if (isMounted) {
          setLoadingMethods(false);
        }
      }
    };

    loadPaymentMethods();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const deadline = booking?.paymentDueAt || booking?.paymentDeadline;
    setCountdownText(getCountdownText(deadline));

    if (!deadline) return undefined;

    const timer = setInterval(() => {
      setCountdownText(getCountdownText(deadline));
    }, 60000);

    return () => clearInterval(timer);
  }, [booking?.paymentDeadline, booking?.paymentDueAt]);

  const selectedPaymentMethod = useMemo(() => {
    if (!paymentMethods.length) return null;

    const normalizedSelectedMethod = normalizeMethod(
      booking?.selectedPaymentMethodName || booking?.paymentMethod || booking?.paymentChannel
    );

    return (
      paymentMethods.find((method) => method?._id === booking?.selectedPaymentMethodId) ||
      paymentMethods.find(
        (method) => getPaymentMethodSelectionKey(method) === String(booking?.selectedPaymentMethodId || "")
      ) ||
      paymentMethods.find(
        (method) => {
          const candidates = [
            method?.name,
            method?.method,
            method?.key,
            method?.code,
            method?.category,
            method?.channel,
          ];

          return candidates.some((candidate) => normalizeMethod(candidate) === normalizedSelectedMethod);
        }
      ) ||
      null
    );
  }, [
    booking?.paymentChannel,
    booking?.paymentMethod,
    booking?.selectedPaymentMethodId,
    booking?.selectedPaymentMethodName,
    paymentMethods,
  ]);

  const qrResolution = useMemo(
    () => getPaymentQrSource(booking, selectedPaymentMethod),
    [booking, selectedPaymentMethod]
  );
  const qrSource = qrResolution.qrSource;
  const qrUrl = useMemo(() => resolveAssetUrl(qrResolution.qrValue), [qrResolution.qrValue]);
  const bookingId = booking?._id || booking?.id || route?.params?.bookingId || booking?.bookingId || "";
  const bookingIdSource = booking?._id
    ? "booking._id"
    : booking?.id
    ? "booking.id"
    : route?.params?.bookingId
    ? "route.params.bookingId"
    : booking?.bookingId
    ? "booking.bookingId"
    : "";
  const bookingReference = getReferenceNo(booking);
  const invoiceReference = valueOrFallback(
    booking?.invoiceReference || booking?.invoiceNumber || booking?.invoice?.invoiceNumber,
    "Pending invoice"
  );
  const paymentStatusLabel = getPaymentStatusDisplay(booking);
  const paymentMethodLabel = getPaymentMethodLabel(booking, selectedPaymentMethod);
  const accountName = valueOrFallback(getAccountName(booking, selectedPaymentMethod));
  const accountNumber = valueOrFallback(getAccountNumber(booking, selectedPaymentMethod));
  const amountToPay = getAmountToPay(booking);
  const shouldAttemptContractFlow = useMemo(() => {
    const status = String(booking?.status || "").toLowerCase();
    const paymentStatus = String(booking?.paymentStatus || "").toLowerCase();
    return Boolean(
      bookingId &&
        ([
          "awaiting_payment",
          "pending_payment",
          "payment_rejected",
          "invoice_issued",
        ].includes(status) ||
          [
            "invoice_issued",
            "pending_payment",
            "payment_pending",
            "rejected",
            "reupload_required",
            "submitted",
            "under_review",
          ].includes(paymentStatus) ||
          booking?.invoiceReference ||
          booking?.invoiceNumber)
    );
  }, [booking?.invoiceNumber, booking?.invoiceReference, booking?.paymentStatus, booking?.status, bookingId]);
  const contractAcceptanceState = useMemo(
    () => getContractAcceptanceState(booking, contractRecord),
    [booking, contractRecord]
  );
  const contractDisplay = useMemo(
    () => extractContractContent(contractRecord || contractTemplate || booking?.contract || booking?.contractData || {}),
    [booking, contractRecord, contractTemplate]
  );
  const requiresContract = Boolean(
    contractAcceptanceState.requiresContract ||
      (shouldAttemptContractFlow &&
        (contractDisplay.content || contractDisplay.pdfUrl || contractRecord || contractTemplate))
  );
  const showContractSection = Boolean(
    shouldAttemptContractFlow ||
      requiresContract ||
      contractAcceptanceState.contractAccepted ||
      contractAcceptanceState.acceptedAt ||
      contractAcceptanceState.contractStatus ||
      booking?.contract ||
      booking?.contractData ||
      booking?.contractAccepted ||
      booking?.contractAcceptedAt ||
      booking?.contractStatus ||
      contractRecord ||
      contractTemplate ||
      /accept the rental contract/i.test(
        `${contractAcceptError || ""} ${proofError || ""} ${contractError || ""}`
      )
  );
  const contractGateRequired = Boolean(
    requiresContract ||
      contractAcceptanceState.contractStatus ||
      booking?.contract ||
      booking?.contractData ||
      booking?.contractAccepted ||
      booking?.contractAcceptedAt ||
      booking?.contractStatus ||
      contractRecord ||
      /accept the rental contract/i.test(
        `${contractAcceptError || ""} ${proofError || ""} ${contractError || ""}`
      )
  );
  const contractAccepted = contractAcceptanceState.contractAccepted;
  const acceptedContractAt = contractAcceptanceState.acceptedAt;
  const contractReadableText = useMemo(
    () => htmlToReadableText(contractDisplay.textContent || contractDisplay.htmlContent || contractDisplay.content),
    [contractDisplay.content, contractDisplay.htmlContent, contractDisplay.textContent]
  );
  const contractPdfSource = contractDisplay.pdfUrl || (bookingId ? getBookingContractPdfUrl(bookingId) : "");
  const invoicePdfSource =
    getInvoicePdfSource(booking, true) ||
    getInvoicePdfSource(booking, false) ||
    (bookingId ? getClientInvoiceUrl(bookingId, true) : "");
  const hasContractReviewContent = Boolean(
    contractReadableText ||
      contractDisplay.textContent ||
      contractDisplay.htmlContent ||
      contractDisplay.content
  );
  const hasContractPdfAvailable = Boolean(contractPdfSource);
  const showContractPdfButton = Boolean(contractAccepted && hasContractPdfAvailable);
  const canAcceptContract = Boolean(!contractAccepted && contractGateRequired);
  const canSubmitContractAcceptance = Boolean(
    canAcceptContract &&
      hasContractReviewContent &&
      contractAgreementChecked &&
      signatureName.trim()
  );
  const effectiveContractError =
    contractError ||
    (!contractLoading && !hasContractReviewContent && requiresContract
      ? "Contract details could not be loaded in-app. Please try again."
      : "");
  const paymentProofEligibility = useMemo(
    () => getPaymentProofEligibility(booking),
    [booking]
  );
  const canUploadPaymentProof = !contractGateRequired || contractAccepted;
  const canSelectOrSubmitPaymentProof =
    paymentProofEligibility.isEligible && canUploadPaymentProof;
  const showContractGateWarning = showContractSection && !contractAccepted;

  useEffect(() => {
    if (__DEV__) {
      console.log("[ContractAPI][id]", {
        usingIdSource: bookingIdSource || "none",
        hasMongoId: Boolean(booking?._id || booking?.id),
        bookingReference: bookingReference || "",
      });
    }
  }, [booking?._id, booking?.id, bookingIdSource, bookingReference]);

  useEffect(() => {
    if (__DEV__) {
      console.log("[PaymentQR][resolve]", {
        methodName:
          selectedPaymentMethod?.name ||
          booking?.selectedPaymentMethodName ||
          booking?.paymentMethod ||
          booking?.paymentChannel ||
          "",
        hasQrUrl: Boolean(qrUrl),
        qrSource,
        checkedFieldsCount: qrResolution.checkedFieldsCount,
      });
    }
  }, [booking?.paymentChannel, booking?.paymentMethod, booking?.selectedPaymentMethodName, qrResolution.checkedFieldsCount, qrSource, qrUrl, selectedPaymentMethod?.name]);

  useEffect(() => {
    setQrImageLoadFailed(false);
  }, [qrUrl]);

  useEffect(() => {
    setSignatureName((prev) => prev || booking?.clientName || booking?.customerName || "");
  }, [booking?.clientName, booking?.customerName]);

  useEffect(() => {
    if (!__DEV__) return;

    console.log("[ContractUX][state]", {
      contractAccepted,
      hasContractContent: hasContractReviewContent,
      showPdfButton: showContractPdfButton,
      canAccept: canSubmitContractAcceptance,
      canUploadProof: canUploadPaymentProof,
    });
  }, [
    canSubmitContractAcceptance,
    canUploadPaymentProof,
    contractAccepted,
    hasContractReviewContent,
    showContractPdfButton,
  ]);

  const loadContractTemplateFallback = async ({ fallbackReason = "" } = {}) => {
    try {
      const templateResponse = await getContractTemplate({ rawResponse: true });
      const templatePayload = templateResponse?.data || {};
      const diagnostics = getContractContentDiagnostics(templatePayload);
      const templateNotice = fallbackReason || getContractTemplateNotice();

      if (__DEV__) {
        console.log("[ContractAPI][fetch:response]", {
          status: templateResponse?.status || null,
          contentType: getHeaderValue(templateResponse?.headers, "content-type"),
          dataKeys: diagnostics.dataKeys,
          nestedKeys: diagnostics.nestedKeys,
          hasHtml: diagnostics.hasHtml,
          hasText: diagnostics.hasText,
          hasTemplate: diagnostics.hasTemplate,
          hasContractTemplate: diagnostics.hasContractTemplate,
          hasContractObject: diagnostics.hasContractObject,
          message: diagnostics.message,
        });
        console.log("[ContractAPI][template:parsed]", {
          hasContractTemplate: diagnostics.hasContractTemplate,
          templateType: diagnostics.templateType,
          extractedContentLength: diagnostics.extractedContentLength,
          usedFallbackTemplate: true,
        });
      }

      setContractRecord(null);
      setContractTemplate(templatePayload);
      setContractNotice(templateNotice);
      setContractError("");
      return templatePayload;
    } catch (templateError) {
      const templateMessage = getFriendlyContractErrorMessage(
        templateError,
        getContractFriendlyError("missing")
      );
      setContractError((prev) => prev || templateMessage);
      return null;
    }
  };

  const fetchContractRecord = async ({
    activeBookingId,
    allowTemplateFallback = true,
    clearExistingError = true,
  } = {}) => {
    const resolvedBookingId =
      activeBookingId ||
      route?.params?.booking?._id ||
      route?.params?.booking?.id ||
      route?.params?.booking?.bookingId ||
      route?.params?.bookingId ||
      bookingId;

    if (!resolvedBookingId) {
      setContractError(getContractFriendlyError("missing"));
      return { record: null, template: null };
    }

    const endpoint = getContractEndpoint(resolvedBookingId);
    const hasToken = Boolean(await AsyncStorage.getItem("clientToken"));

    if (clearExistingError) {
      setContractError("");
      setContractNotice("");
    }

    if (__DEV__) {
      console.log("[ContractAPI][fetch:start]", {
        bookingId: resolvedBookingId,
        endpoint,
        hasToken,
      });
    }

    try {
      const response = await getBookingContract(resolvedBookingId, { rawResponse: true });
      const responseData = response?.data || {};
      const diagnostics = getContractContentDiagnostics(responseData);

      if (__DEV__) {
        console.log("[ContractAPI][fetch:response]", {
          status: response?.status || null,
          contentType: getHeaderValue(response?.headers, "content-type"),
          dataKeys: diagnostics.dataKeys,
          nestedKeys: diagnostics.nestedKeys,
          hasHtml: diagnostics.hasHtml,
          hasText: diagnostics.hasText,
          hasTemplate: diagnostics.hasTemplate,
          hasContractTemplate: diagnostics.hasContractTemplate,
          hasContractObject: diagnostics.hasContractObject,
          message: diagnostics.message,
        });
        console.log("[ContractAPI][template:parsed]", {
          hasContractTemplate: diagnostics.hasContractTemplate,
          templateType: diagnostics.templateType,
          extractedContentLength: diagnostics.extractedContentLength,
          usedFallbackTemplate: false,
        });
      }

      setContractRecord(responseData);
      setContractTemplate(null);
      setContractNotice("");
      if (diagnostics.hasHtml || diagnostics.hasText) {
        setContractError("");
        return { record: responseData, template: null };
      }

      if (allowTemplateFallback) {
        const template = await loadContractTemplateFallback({
          fallbackReason: getContractTemplateNotice(),
        });
        if (template) {
          setContractError("");
          return { record: null, template };
        }
      }

      setContractError("Contract details could not be loaded in-app. Please try again.");
      return { record: responseData, template: null };
    } catch (error) {
      logBookingDocsError("contract", error);
      if (__DEV__) {
        console.log("[ContractAPI][fetch:error]", {
          bookingId: resolvedBookingId,
          endpoint,
          reachedResponse: Boolean(error?.response),
          status: error?.response?.status || null,
          code: error?.code || null,
          message: error?.message || "Unknown error",
          responseData: error?.response?.data || null,
        });
      }

      const status = Number(error?.response?.status || 0);
      const message = getFriendlyContractErrorMessage(error, getContractFriendlyError("load"));
      const responseData = error?.response?.data || null;
      const inlineContract = extractContractContent(responseData || {});
      const diagnostics = getContractContentDiagnostics(responseData || {});

      if (__DEV__ && error?.response) {
        console.log("[ContractAPI][fetch:response]", {
          status: error?.response?.status || null,
          contentType: getHeaderValue(error?.response?.headers, "content-type"),
          dataKeys: diagnostics.dataKeys,
          nestedKeys: diagnostics.nestedKeys,
          hasHtml: diagnostics.hasHtml,
          hasText: diagnostics.hasText,
          hasTemplate: diagnostics.hasTemplate,
          hasContractTemplate: diagnostics.hasContractTemplate,
          hasContractObject: diagnostics.hasContractObject,
          message: diagnostics.message || String(message || "").slice(0, 80),
        });
        console.log("[ContractAPI][template:parsed]", {
          hasContractTemplate: diagnostics.hasContractTemplate,
          templateType: diagnostics.templateType,
          extractedContentLength: diagnostics.extractedContentLength,
          usedFallbackTemplate: false,
        });
      }

      const hasInlineContractContent = Boolean(
        inlineContract.content || inlineContract.htmlContent || inlineContract.textContent
      );

      if (hasInlineContractContent) {
        setContractRecord(responseData);
        setContractTemplate(null);
        setContractNotice(message);
        setContractError("");
        return { record: responseData, template: null };
      }

      if (
        allowTemplateFallback &&
        (status === 404 || (status === 400 && shouldShowPendingContractReview(message)))
      ) {
        const template = await loadContractTemplateFallback({
          fallbackReason: shouldShowPendingContractReview(message)
            ? getContractTemplateNotice()
            : getContractTemplateNotice(),
        });
        if (template) {
          setContractRecord(null);
          setContractError("");
          return { record: null, template };
        }
      }

      setContractError(message);
      setContractRecord(null);

      if (allowTemplateFallback && !error?.response) {
        const template = await loadContractTemplateFallback();
        if (template) {
          setContractError("");
          return { record: null, template };
        }
      }

      return { record: null, template: null };
    }
  };

  useEffect(() => {
    if (!shouldAttemptContractFlow) return;

    let isMounted = true;

    const loadContractPreview = async () => {
      if (!bookingId) return;

      try {
        setContractLoading(true);
        if (!isMounted) return;
        await fetchContractRecord({
          activeBookingId: bookingId,
          allowTemplateFallback: true,
          clearExistingError: true,
        });
      } finally {
        if (isMounted) {
          setContractLoading(false);
        }
      }
    };

    loadContractPreview();

    return () => {
      isMounted = false;
    };
  }, [bookingId, shouldAttemptContractFlow]);

  const pickPaymentProof = async (source) => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to upload payment proof.");
      return;
    }

    const pickerFn =
      source === "camera"
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

    const result = await pickerFn({
      mediaTypes: ["images"],
      quality: 0.85,
      base64: true,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];

    if (!asset?.uri || !asset?.base64) {
      Alert.alert("Upload failed", "Could not prepare the selected image.");
      return;
    }

    setPaymentAsset(asset);
    setProofError("");
  };

  const openPaymentProofPicker = () => {
    if (!canSelectOrSubmitPaymentProof) return;

    Alert.alert("Upload payment proof", "Choose how you want to add the receipt image.", [
      { text: "Camera", onPress: () => pickPaymentProof("camera") },
      { text: "Gallery", onPress: () => pickPaymentProof("gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSubmitProof = async () => {
    if (!bookingId) {
      setProofError("Payment instructions are not available yet.");
      return;
    }

    if (!canUploadPaymentProof) {
      setProofError("");
      return;
    }

    if (!paymentProofEligibility.isEligible) {
      setProofError(
        paymentProofEligibility.isUnderReview
          ? "Your payment proof is being reviewed."
          : "Payment proof upload is not available for this booking yet."
      );
      return;
    }

    if (!paymentAsset) {
      setProofError("Please upload your payment proof.");
      return;
    }

    try {
      setIsSubmittingProof(true);
      setProofError("");
      const paymentProof = toBase64DataUri(paymentAsset);

      if (!paymentProof) {
        setProofError("Please upload your payment proof.");
        return;
      }

      const response = await submitPaymentProof(bookingId, {
        paymentProof,
        replaceExisting: Boolean(booking?.paymentProof),
      });

      const updatedBooking =
        response?.booking || response?.updatedBooking || response?.data?.booking || null;

      if (updatedBooking) {
        setBooking((prev) => ({ ...prev, ...updatedBooking }));
      } else {
        setBooking((prev) => ({
          ...prev,
          paymentStatus: "submitted",
          status: "pending_approval",
        }));
      }

      setPaymentAsset(null);
      setProofSuccessVisible(true);
    } catch (error) {
      const message = String(error?.response?.data?.message || error?.message || "");
      if (message.toLowerCase().includes("accept the rental contract")) {
        setContractAcceptError(
          "Please review and accept the rental contract before uploading your payment proof."
        );
      }
      setProofError(message || "Unable to submit payment proof. Please try again.");
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const removeSelectedPaymentProof = () => {
    setPaymentAsset(null);
    setProofError("");
  };

  const openInvoice = () => {
    if (!invoicePdfSource) {
      navigation.navigate("BookingInvoice", { booking });
      return;
    }

    openInvoicePdf();
  };

  const openInvoicePdf = async () => {
    if (!invoicePdfSource) {
      navigation.navigate("BookingInvoice", { booking });
      return;
    }

    try {
      await openPdf({
        source: invoicePdfSource,
        fileName: `FleetX-Invoice-${bookingReference || invoiceReference || bookingId || "booking"}.pdf`,
        title: "Invoice",
        bookingReference,
        documentReference: invoiceReference,
        type: "invoice",
      });
    } catch (error) {
      logBookingDocsError("invoicePdf", error);
      showPdfError(
        error,
        "Invoice PDF requires secure access. Please try again."
      );
    }
  };

  const openContractReview = async () => {
    setContractModalVisible(true);
    setContractAcceptError("");

    if (hasContractReviewContent) {
      return;
    }

    if (!bookingId) {
      setContractError(getContractFriendlyError("missing"));
      return;
    }

    try {
      setContractLoading(true);
      await fetchContractRecord({
        activeBookingId: bookingId,
        allowTemplateFallback: true,
        clearExistingError: true,
      });
    } finally {
      setContractLoading(false);
    }
  };

  const retryLoadContract = async () => {
    if (!bookingId) {
      setContractError(getContractFriendlyError("missing"));
      return;
    }

    try {
      setContractLoading(true);
      await fetchContractRecord({
        activeBookingId: bookingId,
        allowTemplateFallback: true,
        clearExistingError: true,
      });
    } finally {
      setContractLoading(false);
    }
  };

  const handleOpenContractPdf = async () => {
    if (!contractPdfSource) {
      setContractError(getContractFriendlyError("missing"));
      return;
    }

    if (__DEV__) {
      console.log("[BookingDocs][contractPdf]", {
        bookingIdSource: bookingIdSource || "none",
        urlBuilt: Boolean(contractPdfSource),
        canOpen: Boolean(contractPdfSource),
      });
    }

    try {
      await openPdf({
        source: contractPdfSource,
        fileName: `FleetX-Contract-${bookingReference || getBookingId(booking) || "booking"}.pdf`,
        title: "Rental Contract",
        bookingReference,
        documentReference: invoiceReference,
        type: "contract",
      });
    } catch (error) {
      logBookingDocsError("contractPdf", error);
      const message =
        error?.code === "CONTRACT_NOT_ACCEPTED"
          ? getContractPdfPendingMessage()
          : String(error?.message || "").trim();

      if (message) {
        setContractError(message);
      }

      if (error?.code === "CONTRACT_NOT_ACCEPTED" || shouldShowPendingContractReview(message)) {
        setContractModalVisible(true);

        if (!hasContractReviewContent && bookingId) {
          try {
            setContractLoading(true);
            await fetchContractRecord({
              activeBookingId: bookingId,
              allowTemplateFallback: true,
              clearExistingError: false,
            });
          } finally {
            setContractLoading(false);
          }
        }

        return;
      }

      showPdfError(
        error,
        "Contract PDF requires secure access. Please use the in-app contract view or try again."
      );
    }
  };

  const handleAcceptContract = async () => {
    if (!bookingId) {
      setContractAcceptError(getContractFriendlyError("accept"));
      return;
    }

    if (!hasContractReviewContent) {
      setContractAcceptError("Please load and review the rental contract before accepting.");
      return;
    }

    if (!contractAgreementChecked || !signatureName.trim()) {
      return;
    }

    try {
      setContractAccepting(true);
      setContractAcceptError("");
      const payload = {
        accepted: true,
        signatureName: signatureName.trim(),
        acceptedAt: new Date().toISOString(),
      };
      const response = await acceptBookingContract(bookingId, payload);
      const updatedBooking =
        response?.booking || response?.updatedBooking || response?.data?.booking || null;
      const acceptedAt =
        response?.contract?.acceptedAt ||
        response?.acceptedAt ||
        response?.data?.acceptedAt ||
        payload.acceptedAt;

      if (updatedBooking) {
        setBooking((prev) => ({ ...prev, ...updatedBooking, contractAccepted: true }));
      } else {
        setBooking((prev) => ({
          ...prev,
          contractAccepted: true,
          contractAcceptedAt: acceptedAt,
          contractStatus: "accepted",
          requiresContract: true,
          contract: {
            ...(prev?.contract || {}),
            accepted: true,
            acceptedAt,
            status: "accepted",
          },
        }));
      }

      setContractRecord((prev) => ({
        ...(prev || {}),
        ...response,
        contract: {
          ...(prev?.contract || {}),
          ...(response?.contract || {}),
          accepted: true,
          acceptedAt,
          status: "accepted",
          signatureName: signatureName.trim(),
        },
      }));
      if (__DEV__) {
        console.log("[ContractAPI][accept:success]", {
          bookingIdSource: bookingIdSource || "none",
          contractAccepted: true,
        });
      }
      setContractError("");
      setContractNotice("");
      setContractModalVisible(false);
      setContractAgreementChecked(false);
      setPaymentAsset(null);
    } catch (error) {
      logBookingDocsError("contractAccept", error);
      setContractAcceptError(
        getFriendlyContractErrorMessage(error, getContractFriendlyError("accept"))
      );
    } finally {
      setContractAccepting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#0B132B" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Payment Instructions</Text>
            <Text style={styles.subtitle}>{bookingReference}</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{paymentStatusLabel}</Text>
          <Text style={styles.statusBody}>
            Selected method: {paymentMethodLabel}
          </Text>
          <Text style={styles.statusHelper}>
            Payment option: {formatPaymentOption(booking?.paymentOption)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment QR</Text>
          {loadingMethods && !qrUrl && !qrImageLoadFailed ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#F47C20" />
              <Text style={styles.loadingText}>Loading payment QR...</Text>
            </View>
          ) : qrUrl && !qrImageLoadFailed ? (
            <TouchableOpacity style={styles.qrCard} activeOpacity={0.9} onPress={() => setQrPreviewVisible(true)}>
              <Image
                source={{ uri: qrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
                onError={() => setQrImageLoadFailed(true)}
              />
              <Text style={styles.qrHint}>Tap to enlarge</Text>
            </TouchableOpacity>
          ) : qrImageLoadFailed ? (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>
                QR code could not be loaded. Please use the account details below.
              </Text>
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>
                QR code is not available for this payment method.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Bank / Wallet</Text>
            <Text style={styles.detailValue}>{paymentMethodLabel}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Account Name</Text>
            <Text style={styles.detailValue}>{accountName}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Account Number</Text>
            <Text style={styles.detailValue}>{accountNumber}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Booking Reference</Text>
            <Text style={styles.detailValue}>{bookingReference}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Invoice Reference</Text>
            <Text style={styles.detailValue}>{invoiceReference}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Amount to Pay</Text>
            <Text style={styles.detailValue}>{formatBookingPrice(amountToPay)}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Payment Deadline</Text>
            <Text style={styles.detailValue}>
              {valueOrFallback(formatBookingDateTime(booking?.paymentDueAt || booking?.paymentDeadline), "No deadline set")}
            </Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Countdown</Text>
            <Text style={styles.detailValue}>{countdownText}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Scan the QR code or transfer to the account shown. After payment, upload a clear screenshot or photo of your receipt.
          </Text>
          <Text style={styles.infoText}>
            Transfer the exact amount to the listed account.
          </Text>
          <Text style={styles.infoText}>
            Please upload your payment proof before the deadline to secure your booking.
          </Text>
        </View>

        {showContractSection ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Rental Contract</Text>
            <View
              style={[
                styles.contractStatusPill,
                contractAccepted
                  ? styles.contractStatusPillAccepted
                  : styles.contractStatusPillPending,
              ]}
            >
              <Text
                style={[
                  styles.contractStatusText,
                  contractAccepted
                    ? styles.contractStatusTextAccepted
                    : styles.contractStatusTextPending,
                ]}
              >
                {contractAccepted ? "Accepted" : "Pending Acceptance"}
              </Text>
            </View>
            <Text style={styles.contractBodyText}>
              {contractAccepted
                ? "Rental contract accepted."
                : "Please review and accept the rental contract before uploading your payment proof."}
            </Text>
            {acceptedContractAt ? (
              <Text style={styles.contractHelperText}>
                Accepted on {formatBookingDateTime(acceptedContractAt)}
              </Text>
            ) : null}
            {effectiveContractError ? (
              <Text style={styles.inlineErrorText}>{effectiveContractError}</Text>
            ) : null}
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={openContractReview}>
              <Text style={styles.secondaryButtonText}>
                {contractAccepted ? "View Contract" : "Review Contract"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Proof of Payment</Text>
          {paymentProofEligibility.isUnderReview ? (
            <View style={styles.contractAcceptedCard}>
              <Text style={styles.contractAcceptedText}>Your payment proof is being reviewed.</Text>
              <Text style={styles.contractAcceptedSubtext}>Under Review</Text>
            </View>
          ) : null}
          {!paymentProofEligibility.isEligible &&
          !paymentProofEligibility.isUnderReview &&
          !paymentProofEligibility.isLocked ? (
            <View style={styles.contractGateCard}>
              <Text style={styles.contractGateText}>
                Payment proof upload will appear once your invoice is ready.
              </Text>
            </View>
          ) : null}
          {!canUploadPaymentProof && showContractGateWarning ? (
            <View style={styles.contractGateCard}>
              <Text style={styles.contractGateText}>
                Please review and accept the rental contract before uploading your payment proof.
              </Text>
            </View>
          ) : null}
          {contractAcceptError &&
          !/please review and accept the rental contract before uploading your payment proof\./i.test(
            contractAcceptError
          ) ? (
            <Text style={styles.inlineErrorText}>{contractAcceptError}</Text>
          ) : null}
          {proofError ? <Text style={styles.inlineErrorText}>{proofError}</Text> : null}

          {paymentProofEligibility.isEligible && paymentAsset?.uri ? (
            <View style={styles.proofPreviewCard}>
              <Image source={{ uri: paymentAsset.uri }} style={styles.proofPreviewImage} />
              <Text style={styles.assetName} numberOfLines={1}>
                {paymentAsset.fileName || paymentAsset.uri.split("/").pop()}
              </Text>
              <View style={styles.proofActionRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    styles.proofActionButton,
                    !canSelectOrSubmitPaymentProof && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.9}
                  onPress={openPaymentProofPicker}
                  disabled={!canSelectOrSubmitPaymentProof}
                >
                  <Text style={styles.secondaryButtonText}>Replace Proof</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.proofActionButton]}
                  activeOpacity={0.9}
                  onPress={removeSelectedPaymentProof}
                >
                  <Text style={styles.secondaryButtonText}>Remove Proof</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : paymentProofEligibility.isEligible ? (
            <TouchableOpacity
              style={[styles.secondaryButton, !canSelectOrSubmitPaymentProof && styles.buttonDisabled]}
              activeOpacity={0.9}
              onPress={openPaymentProofPicker}
              disabled={!canSelectOrSubmitPaymentProof}
            >
              <Text style={styles.secondaryButtonText}>Upload Payment Proof</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={openInvoice}>
            <Text style={styles.secondaryButtonText}>View Invoice</Text>
          </TouchableOpacity>

          {paymentProofEligibility.isEligible ? (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (isSubmittingProof || !canSelectOrSubmitPaymentProof || !paymentAsset?.uri) &&
                  styles.buttonDisabled,
              ]}
              activeOpacity={0.9}
              disabled={isSubmittingProof || !canSelectOrSubmitPaymentProof || !paymentAsset?.uri}
              onPress={handleSubmitProof}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmittingProof ? "Submitting..." : "Submit Payment Proof"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={qrPreviewVisible} transparent animationType="fade" onRequestClose={() => setQrPreviewVisible(false)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setQrPreviewVisible(false)}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{paymentMethodLabel}</Text>
            {accountNumber !== "Not available" ? (
              <Text style={styles.previewSubtitle}>{accountNumber}</Text>
            ) : null}
            {qrUrl ? <Image source={{ uri: qrUrl }} style={styles.previewImage} resizeMode="contain" /> : null}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={contractModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContractModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.contractModalCard}>
            <View style={styles.contractModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contractModalTitle}>
                  {contractDisplay.title || "Rental Contract"}
                </Text>
                <Text style={styles.contractModalSubtitle}>{bookingReference}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setContractModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {contractLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#F47C20" />
                <Text style={styles.loadingText}>Loading contract...</Text>
              </View>
            ) : (
              <>
                <ScrollView
                  style={styles.contractScroll}
                  contentContainerStyle={styles.contractScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {contractReadableText ? (
                    <Text style={styles.contractText}>{contractReadableText}</Text>
                  ) : contractAccepted && hasContractPdfAvailable ? (
                    <Text style={styles.placeholderText}>
                      Contract text is not available in-app right now. You can open the contract PDF below.
                    </Text>
                  ) : (
                    <Text style={styles.placeholderText}>
                      {effectiveContractError || "Contract details could not be loaded in-app. Please try again."}
                    </Text>
                  )}
                </ScrollView>

                {contractNotice ? (
                  <Text style={styles.contractHelperText}>{contractNotice}</Text>
                ) : null}
                {effectiveContractError && hasContractReviewContent ? (
                  <Text style={styles.inlineErrorText}>{effectiveContractError}</Text>
                ) : null}
                {contractAcceptError ? (
                  <Text style={styles.inlineErrorText}>{contractAcceptError}</Text>
                ) : null}
                {!hasContractReviewContent ? (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    activeOpacity={0.9}
                    onPress={retryLoadContract}
                  >
                    <Text style={styles.secondaryButtonText}>Retry Load Contract</Text>
                  </TouchableOpacity>
                ) : null}
                {!contractAccepted ? (
                  <Text style={styles.contractHelperText}>
                    PDF will be available after accepting the contract.
                  </Text>
                ) : null}
                {showContractPdfButton ? (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    activeOpacity={0.9}
                    onPress={handleOpenContractPdf}
                  >
                    <Text style={styles.secondaryButtonText}>View Contract PDF</Text>
                  </TouchableOpacity>
                ) : null}

                {!contractAccepted && canAcceptContract ? (
                  <>
                    {!hasContractReviewContent ? (
                      <Text style={styles.contractHelperText}>
                        Please load and review the rental contract before accepting.
                      </Text>
                    ) : null}
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      activeOpacity={0.85}
                      onPress={() => setContractAgreementChecked((prev) => !prev)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          contractAgreementChecked && styles.checkboxChecked,
                        ]}
                      >
                        {contractAgreementChecked ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <Text style={styles.checkboxText}>
                        I have reviewed the rental contract and agree to its terms.
                      </Text>
                    </TouchableOpacity>

                    <TextInput
                      value={signatureName}
                      onChangeText={setSignatureName}
                      placeholder="Type your full name"
                      placeholderTextColor="#98A2B3"
                      style={styles.signatureInput}
                    />

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        (!canSubmitContractAcceptance || contractAccepting) &&
                          styles.buttonDisabled,
                      ]}
                      activeOpacity={0.9}
                      disabled={!canSubmitContractAcceptance || contractAccepting}
                      onPress={handleAcceptContract}
                    >
                      <Text style={styles.primaryButtonText}>
                        {contractAccepting ? "Accepting..." : "Accept Contract"}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : contractAccepted ? (
                  <View style={styles.contractAcceptedCard}>
                    <Text style={styles.contractAcceptedText}>Rental contract accepted.</Text>
                    {acceptedContractAt ? (
                      <Text style={styles.contractAcceptedSubtext}>
                        Accepted on {formatBookingDateTime(acceptedContractAt)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>

      <SuccessInfoModal
        visible={proofSuccessVisible}
        title="Payment Proof Submitted"
        message="Your payment proof has been submitted successfully. FleetX will verify your payment."
        note="Updates usually appear within a few minutes to an hour."
        steps={[
          "You can track your payment status in My Bookings.",
          "FleetX will review your uploaded payment proof.",
          "Your receipt will be available after verification.",
        ]}
        reference={bookingReference}
        primaryActionLabel="View My Bookings"
        secondaryActionLabel="Stay Here"
        onPrimary={() => {
          setProofSuccessVisible(false);
          navigation.navigate("MainApp", { screen: "Bookings" });
        }}
        onSecondary={() => setProofSuccessVisible(false)}
        onClose={() => setProofSuccessVisible(false)}
      />
    </SafeAreaView>
  );
}
