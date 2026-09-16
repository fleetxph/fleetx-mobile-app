import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_ORIGIN, BASE_URL } from "../api/api";
import {
  getClientBookingById,
  getClientBookings,
  getClientInvoiceUrl,
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
import { getContractAcceptanceState } from "../utils/bookingContractDisplay";
import { getBookingStatusLabel, getBookingStatusMeta } from "../utils/bookingStatusDisplay";
import { resolveImageUrl } from "../utils/imageUrl";
import { dedupePaymentMethods, getPaymentMethodSelectionKey } from "../utils/paymentMethods";
import { openPdf, showPdfError } from "../utils/pdfUtils";
import {
  notifyWithVibration,
  syncStoredBookingStatusSnapshot,
} from "../services/notificationService";

function valueOrFallback(value, fallback = "Not available") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function normalizeMethod(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function isLikelyMongoId(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

function mergeBookingData(baseBooking = {}, incomingBooking = {}) {
  return {
    ...baseBooking,
    ...incomingBooking,
    invoice: {
      ...(baseBooking?.invoice || {}),
      ...(incomingBooking?.invoice || {}),
    },
    contract: {
      ...(baseBooking?.contract || {}),
      ...(incomingBooking?.contract || {}),
    },
    contractData: {
      ...(baseBooking?.contractData || {}),
      ...(incomingBooking?.contractData || {}),
    },
    vehicle: {
      ...(baseBooking?.vehicle || {}),
      ...(incomingBooking?.vehicle || {}),
    },
    user: {
      ...(baseBooking?.user || {}),
      ...(incomingBooking?.user || {}),
    },
    customer: {
      ...(baseBooking?.customer || {}),
      ...(incomingBooking?.customer || {}),
    },
  };
}

function extractBookingFromResponse(payload) {
  const candidate = payload?.booking || payload?.data?.booking || payload?.data || payload;
  return candidate && typeof candidate === "object" ? candidate : null;
}

function findMatchingBooking(bookings = [], booking = {}, routeParams = {}) {
  const lookup = new Set(
    [
      booking?._id,
      booking?.id,
      booking?.bookingId,
      booking?.bookingReference,
      booking?.bookingCode,
      booking?.reference,
      booking?.referenceNo,
      routeParams?.bookingId,
      routeParams?.bookingReference,
    ]
      .map(normalizeIdentifier)
      .filter(Boolean)
  );
  if (!lookup.size) return null;

  return (
    bookings.find((item) =>
      [
        item?._id,
        item?.id,
        item?.bookingId,
        item?.bookingReference,
        item?.bookingCode,
        item?.reference,
        item?.referenceNo,
      ]
        .map(normalizeIdentifier)
        .filter(Boolean)
        .some((value) => lookup.has(value))
    ) || null
  );
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
  const locallyEligible =
    !isUnderReview &&
    !isLocked &&
    (statusMeta.key === "awaiting_payment" ||
      (status === "approved" && hasInvoiceOrPaymentDetails) ||
      ["invoice_issued", "pending_payment", "payment_pending", "rejected", "reupload_required"].includes(
        paymentStatus
      ));
  const isEligible =
    typeof booking?.paymentProofUploadEligible === "boolean"
      ? booking.paymentProofUploadEligible
      : locallyEligible;

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
  const [contractAcceptError, setContractAcceptError] = useState("");
  const [qrImageLoadFailed, setQrImageLoadFailed] = useState(false);
  const [countdownText, setCountdownText] = useState(
    getCountdownText(route?.params?.booking?.paymentDueAt || route?.params?.booking?.paymentDeadline)
  );
  const contractPromptShownRef = useRef({});
  const bookingRefreshInFlightRef = useRef(false);

  useEffect(() => {
    if (route?.params?.booking) {
      setBooking((prev) => mergeBookingData(prev || {}, route.params.booking));
    }
  }, [route?.params?.booking]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("contractAccepted", (event) => {
      const acceptedBookingId = event?.bookingId || "";
      if (!acceptedBookingId || acceptedBookingId !== bookingId) return;

      if (event?.updatedBooking) {
        setBooking((prev) =>
          mergeBookingData(prev || {}, {
            ...event.updatedBooking,
            contractAccepted: true,
          })
        );
      } else {
        setBooking((prev) =>
          mergeBookingData(prev || {}, {
            contractAccepted: true,
            contractAcceptedAt: event?.acceptedAt || prev?.contractAcceptedAt,
            contractStatus: "accepted",
          })
        );
      }

      setContractAcceptError("");
      setProofError("");
    });

    return () => subscription.remove();
  }, [bookingId]);

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
  const contractAcceptanceState = useMemo(() => getContractAcceptanceState(booking, null), [booking]);
  const requiresContract = Boolean(contractAcceptanceState.requiresContract || shouldAttemptContractFlow);
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
      /accept the rental contract/i.test(`${proofError || ""}`)
  );
  const contractGateRequired = Boolean(
    requiresContract ||
      contractAcceptanceState.contractStatus ||
      booking?.contract ||
      booking?.contractData ||
      booking?.contractAccepted ||
      booking?.contractAcceptedAt ||
      booking?.contractStatus ||
      /accept the rental contract/i.test(`${proofError || ""}`)
  );
  const contractAccepted = contractAcceptanceState.contractAccepted;
  const acceptedContractAt = contractAcceptanceState.acceptedAt;
  const invoicePdfSource =
    getInvoicePdfSource(booking, true) ||
    getInvoicePdfSource(booking, false) ||
    (bookingId ? getClientInvoiceUrl(bookingId, true) : "");
  const paymentProofEligibility = useMemo(
    () => getPaymentProofEligibility(booking),
    [booking]
  );
  const canUploadPaymentProof = !contractGateRequired || contractAccepted;
  const canSelectOrSubmitPaymentProof =
    paymentProofEligibility.isEligible && canUploadPaymentProof;
  const showContractGateWarning = showContractSection && !contractAccepted;

  useEffect(() => {
    let isMounted = true;

    const refreshBookingDetails = async () => {
      if (bookingRefreshInFlightRef.current) return;

      const currentBooking = route?.params?.booking || booking || {};
      let nextBooking = currentBooking;
      let resolvedBookingId =
        currentBooking?._id || currentBooking?.id || currentBooking?.bookingId || route?.params?.bookingId || "";

      try {
        bookingRefreshInFlightRef.current = true;

        if (isLikelyMongoId(resolvedBookingId)) {
          const response = await getClientBookingById(resolvedBookingId, { rawResponse: true });
          const fetchedBooking = extractBookingFromResponse(response?.data);
          if (fetchedBooking) {
            nextBooking = mergeBookingData(nextBooking, fetchedBooking);
          }
        } else {
          const response = await getClientBookings();
          const bookings = Array.isArray(response?.bookings)
            ? response.bookings
            : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];
          const matchedBooking = findMatchingBooking(bookings, currentBooking, route?.params || {});
          if (matchedBooking) {
            nextBooking = mergeBookingData(nextBooking, matchedBooking);
            resolvedBookingId =
              matchedBooking?._id || matchedBooking?.id || matchedBooking?.bookingId || resolvedBookingId;
          }

          if (matchedBooking && isLikelyMongoId(resolvedBookingId)) {
            const detailResponse = await getClientBookingById(resolvedBookingId, { rawResponse: true });
            const fetchedBooking = extractBookingFromResponse(detailResponse?.data);
            if (fetchedBooking) {
              nextBooking = mergeBookingData(nextBooking, fetchedBooking);
            }
          }
        }

        if (!isMounted) return;
        setBooking((prev) => mergeBookingData(prev || {}, nextBooking));
      } catch (error) {
        logBookingDocsError("paymentInstructionsRefresh", error);
      } finally {
        bookingRefreshInFlightRef.current = false;
      }
    };

    if (route?.params?.contractAccepted) {
      setBooking((prev) =>
        mergeBookingData(prev || {}, {
          contractAccepted: true,
          contractAcceptedAt: route?.params?.booking?.contractAcceptedAt || prev?.contractAcceptedAt,
          contractStatus: "accepted",
        })
      );
      setContractAcceptError("");
      setProofError("");
    }

    const unsubscribe = navigation.addListener("focus", () => {
      if (route?.params?.refreshBooking || route?.params?.contractAccepted) {
        refreshBookingDetails();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [
    navigation,
    route?.params?.booking,
    route?.params?.bookingId,
    route?.params?.bookingReference,
    route?.params?.contractAccepted,
    route?.params?.refreshBooking,
  ]);

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
    if (!__DEV__) return;

    console.log("[ContractUX][state]", {
      contractAccepted,
      canUploadProof: canUploadPaymentProof,
      contractGateRequired,
    });
  }, [canUploadPaymentProof, contractAccepted, contractGateRequired]);

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
      const nextBooking = updatedBooking
        ? { ...booking, ...updatedBooking }
        : {
            ...booking,
            paymentStatus: "submitted",
            status: "pending_approval",
          };

      if (updatedBooking) {
        setBooking((prev) => ({ ...prev, ...updatedBooking }));
      } else {
        setBooking((prev) => ({
          ...prev,
          paymentStatus: "submitted",
          status: "pending_approval",
        }));
      }

      await syncStoredBookingStatusSnapshot([nextBooking]);
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
    setContractAcceptError("");

    if (bookingId && !contractAccepted && !contractPromptShownRef.current[bookingId]) {
      contractPromptShownRef.current[bookingId] = true;
      notifyWithVibration({
        title: "Contract required",
        body: "Please review and accept your rental contract before uploading payment proof.",
        data: {
          bookingId,
          bookingReference,
          notificationType: "contract_required",
        },
      }).catch(() => {});
    }
    navigation.navigate("ContractReview", {
      booking,
      bookingId,
      bookingReference,
      sourceRoute: "PaymentInstructions",
    });
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
          !paymentProofEligibility.isLocked &&
          (contractAccepted || !showContractGateWarning) ? (
            <View style={styles.contractGateCard}>
              <Text style={styles.contractGateText}>
                {booking?.paymentProofUploadReason ||
                  "Payment proof upload will appear once your invoice is ready."}
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
