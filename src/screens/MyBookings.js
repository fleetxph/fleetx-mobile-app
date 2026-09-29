import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFriendlyApiErrorMessage, isUnauthorizedError } from "../api/api";
import {
  cancelClientBooking,
  getAdditionalInvoicePdf,
  getClientBookings,
  requestBookingExtension,
  resumeClientBooking,
} from "../api/clientApi";
import { styles } from "../styles/myBookingsStyle";
import { canCancelBooking } from "../utils/bookingActions";
import {
  ACTIVE_BOOKING_STATUS_KEYS,
  BOOKING_VIEW_TABS,
  BOOKING_STATUS_FILTERS,
  HISTORY_BOOKING_STATUS_KEYS,
  getBookingAmountLabel,
  getBookingNextAction,
  getBookingStatusMeta,
  isActiveBooking,
  isHistoryBooking,
} from "../utils/bookingStatusDisplay";
import { getInvoicePdfSource, getReceiptPdfSource } from "../utils/bookingDocuments";
import { getVehicleImageUrl } from "../utils/imageUrl";
import {
  getBookingInvoicePaymentDetails,
  getBookingReceiptDetails,
  isAwaitingPaymentBooking,
} from "../utils/bookingPaymentDisplay";
import {
  syncStoredBookingStatusSnapshot,
} from "../services/notificationService";
import { openPdf, showPdfError } from "../utils/pdfUtils";

const ADDITIONAL_INVOICE_REASON_LABELS = {
  extension: "Extension",
  late_return: "Late Return",
  penalty: "Penalty",
  return_assessment: "Return Assessment",
  manual_adjustment: "Manual Adjustment",
};

function getBookingId(item) {
  return item?._id || item?.id || "";
}

function getVehicleName(item) {
  if (item?.vehicleId?.make && item?.vehicleId?.model) {
    return `${item.vehicleId.make} ${item.vehicleId.model}`;
  }
  return item?.vehicleName || "Vehicle";
}

function formatDate(date) {
  if (!date) return "N/A";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "N/A";
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDays(startDate, endDate) {
  if (!startDate || !endDate) return "0d";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return `${diff > 0 ? diff : 1}d`;
}

function getReferenceNo(item) {
  if (item?.bookingReference) return item.bookingReference;
  if (item?.bookingCode) return item.bookingCode;
  if (item?.referenceNo) return item.referenceNo;
  if (item?._id) return `DR-${item._id.slice(-6).toUpperCase()}`;
  return "Draft Booking";
}

function getPaymentLabel(item) {
  const value = String(item?.paymentStatus || "").toLowerCase();
  if (["verified", "fully_paid", "downpayment_paid"].includes(value)) return "Verified";
  if (["submitted", "payment_submitted", "under_review", "pending"].includes(value)) {
    return "Under Review";
  }
  if (["rejected", "reupload_required"].includes(value)) return "Rejected";
  if (value === "invoice_issued") return "Invoice issued";
  if (value === "expired") return "Expired";
  return "Not submitted";
}

function canSubmitPayment(item) {
  return isAwaitingPaymentBooking(item);
}

function shouldShowPaymentPanel(item) {
  const meta = getBookingStatusMeta(item);
  return (
    meta.key === "awaiting_payment" ||
    (isAwaitingPaymentBooking(item) &&
      !["confirmed", "completed", "cancelled", "rejected", "expired", "archived", "closed"].includes(meta.key))
  );
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "Select time";
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateInput(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInput(value) {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getBookingReturnDateTime(item) {
  const dateValue = item?.endDate || item?.returnDate || item?.dropoffDate;
  if (!dateValue) return null;

  const timeValue = String(item?.endTime || item?.returnTime || item?.dropoffTime || "");
  const dateKey = String(dateValue).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const timeMatch = timeValue.match(/^(\d{1,2}):(\d{2})/);
  const hasEmbeddedTime = /T\d{2}:\d{2}/.test(String(dateValue));
  const parsed =
    dateKey && timeMatch
      ? new Date(`${dateKey}T${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}:00`)
      : dateKey && !hasEmbeddedTime
      ? new Date(`${dateKey}T00:00:00`)
      : new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) return null;

  if (!dateKey && timeMatch) {
    parsed.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
  }

  return parsed;
}

function combineExtensionDateTime(dateValue, timeValue) {
  if (!(dateValue instanceof Date) || !(timeValue instanceof Date)) return null;
  const combined = new Date(dateValue);
  combined.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
  return Number.isNaN(combined.getTime()) ? null : combined;
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function formatStatusLabel(value) {
  const normalized = normalizeStatus(value);
  if (!normalized) return "";
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getExtensionState(item) {
  const requests = Array.isArray(item?.extensionRequests) ? item.extensionRequests : [];
  const pendingStatuses = ["pending", "submitted", "under_review"];
  const pendingRequest = requests.find((request) =>
    pendingStatuses.includes(normalizeStatus(request?.status || request?.requestStatus))
  );
  const latestRequest = requests.length ? requests[requests.length - 1] : null;
  const directStatus = normalizeStatus(item?.extensionStatus);
  const latestStatus = normalizeStatus(latestRequest?.status || latestRequest?.requestStatus);
  const status = pendingRequest ? "pending" : directStatus || latestStatus;

  return {
    status,
    isPending: Boolean(pendingRequest || pendingStatuses.includes(directStatus)),
    label: status ? `Extension Request ${formatStatusLabel(status)}` : "",
  };
}

function canRequestExtension(item) {
  const extensionState = getExtensionState(item);

  return Boolean(
    getBookingId(item) &&
      !extensionState.isPending &&
      !String(item?.extensionRequestIneligibleReason || "").trim()
  );
}

function getAdditionalPaymentDetails(item) {
  const payment =
    item?.additionalPayment && typeof item.additionalPayment === "object"
      ? item.additionalPayment
      : {};
  const reasonKey = normalizeStatus(payment?.reason || payment?.reasonType || payment?.type);
  const amount = [
    payment?.totalAdditionalAmount,
    payment?.totalAmountDue,
    payment?.amountDue,
  ]
    .map(Number)
    .find((value) => Number.isFinite(value) && value > 0) || 0;

  return {
    required: payment?.required === true,
    invoiceReference:
      payment?.invoiceReference || payment?.invoiceNumber || payment?.reference || "",
    reason: ADDITIONAL_INVOICE_REASON_LABELS[reasonKey] || formatStatusLabel(reasonKey),
    amount,
    status: formatStatusLabel(
      payment?.status || payment?.paymentStatus || item?.additionalPaymentStatus
    ),
    paymentDueAt: payment?.paymentDueAt || payment?.dueDate || payment?.deadline || "",
    invoiceIssuedAt: payment?.invoiceIssuedAt || payment?.issuedAt || payment?.createdAt || "",
    documentReference:
      payment?.invoiceReference || payment?.invoiceNumber || payment?.reference || "",
  };
}

export default function MyBookings({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState("active");
  const [activeFilter, setActiveFilter] = useState("all");
  const [failedImages, setFailedImages] = useState({});
  const [extensionBooking, setExtensionBooking] = useState(null);
  const [extensionDate, setExtensionDate] = useState(null);
  const [extensionTime, setExtensionTime] = useState(null);
  const [extensionReason, setExtensionReason] = useState("");
  const [extensionPicker, setExtensionPicker] = useState("");
  const [extensionSubmitting, setExtensionSubmitting] = useState(false);
  const [additionalInvoiceOpeningId, setAdditionalInvoiceOpeningId] = useState("");

  const loadBookings = useCallback(
    async (mode = "load") => {
      try {
        mode === "refresh" ? setRefreshing(true) : setLoading(true);
        const token =
          Platform.OS === "web"
            ? window.localStorage.getItem("clientToken") || window.localStorage.getItem("token")
            : (await AsyncStorage.getItem("clientToken")) || (await AsyncStorage.getItem("token"));

        if (!token) {
          setHasToken(false);
          setBookings([]);
          return;
        }

        setHasToken(true);
        const res = await getClientBookings();
        const nextBookings = Array.isArray(res?.bookings) ? res.bookings : [];
        setBookings(nextBookings);
      } catch (err) {
        if (isUnauthorizedError(err)) {
          navigation.replace("ClientLogin");
          return;
        }
        Alert.alert(
          "Could not load bookings",
          getFriendlyApiErrorMessage(err, "Please try again.")
        );
        setBookings([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigation]
  );

  useEffect(() => {
    loadBookings();
    const unsubscribe = navigation.addListener("focus", () => loadBookings("refresh"));
    return unsubscribe;
  }, [loadBookings, navigation]);

  const scopedBookings = useMemo(() => {
    return bookings.filter((item) => (activeView === "history" ? isHistoryBooking(item) : isActiveBooking(item)));
  }, [activeView, bookings]);

  const activeBookingsCount = useMemo(
    () => bookings.filter((item) => isActiveBooking(item)).length,
    [bookings]
  );
  const historyBookingsCount = useMemo(
    () => bookings.filter((item) => isHistoryBooking(item)).length,
    [bookings]
  );

  const viewTabs = useMemo(
    () =>
      BOOKING_VIEW_TABS.map((item) => ({
        ...item,
        label: `${item.label} (${item.key === "history" ? historyBookingsCount : activeBookingsCount})`,
      })),
    [activeBookingsCount, historyBookingsCount]
  );

  const availableFilters = useMemo(() => {
    const allowedKeys =
      activeView === "history"
        ? ["all", ...HISTORY_BOOKING_STATUS_KEYS]
        : ["all", ...ACTIVE_BOOKING_STATUS_KEYS.filter((key) => key !== "processing")];

    return BOOKING_STATUS_FILTERS.filter((item) => allowedKeys.includes(item.key));
  }, [activeView]);

  const filteredBookings = useMemo(() => {
    if (activeFilter === "all") return scopedBookings;
    return scopedBookings.filter((item) => getBookingStatusMeta(item).key === activeFilter);
  }, [activeFilter, scopedBookings]);

  useEffect(() => {
    const filterIsAvailable = availableFilters.some((item) => item.key === activeFilter);
    if (!filterIsAvailable) {
      setActiveFilter("all");
    }
  }, [activeFilter, availableFilters]);

  useEffect(() => {
    if (!__DEV__) return;

    console.log("[BookingsFilter][mobile]", {
      total: bookings.length,
      activeCount: activeBookingsCount,
      historyCount: historyBookingsCount,
    });
  }, [activeBookingsCount, bookings.length, historyBookingsCount]);

  const handleResume = async (booking) => {
    const bookingId = getBookingId(booking);
    try {
      const res = await resumeClientBooking(bookingId);
      navigation.navigate("Plan", {
        bookingDraft: res?.booking || booking,
        selectedVehicle: res?.booking?.vehicleId || booking?.vehicleId,
        tripData: res?.booking || booking,
      });
    } catch (err) {
      Alert.alert(
        "Could not continue booking",
        getFriendlyApiErrorMessage(err, "Please try again.")
      );
    }
  };

  const handleCancel = (booking) => {
    const bookingId = getBookingId(booking);
    Alert.alert("Cancel booking", "This will cancel the booking request in FleetX.", [
      { text: "Keep Booking", style: "cancel" },
      {
        text: "Cancel Booking",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await cancelClientBooking(bookingId, {
              cancellationReason: "Cancelled from mobile app.",
            });
            const updatedBooking =
              response?.booking || response?.updatedBooking || response?.data?.booking || null;
            await syncStoredBookingStatusSnapshot([
              updatedBooking
                ? { ...booking, ...updatedBooking }
                : { ...booking, status: "cancelled", bookingStatus: "cancelled" },
            ]);
            await loadBookings("refresh");
          } catch (err) {
            Alert.alert(
              "Cancel failed",
              getFriendlyApiErrorMessage(err, "Please try again.")
            );
          }
        },
      },
    ]);
  };

  const closeExtensionModal = () => {
    if (extensionSubmitting) return;
    setExtensionBooking(null);
    setExtensionDate(null);
    setExtensionTime(null);
    setExtensionReason("");
    setExtensionPicker("");
  };

  const openExtensionModal = (booking) => {
    const currentReturn = getBookingReturnDateTime(booking);
    const proposedReturn = new Date(currentReturn || Date.now());
    proposedReturn.setDate(proposedReturn.getDate() + 1);

    setExtensionBooking(booking);
    setExtensionDate(proposedReturn);
    setExtensionTime(proposedReturn);
    setExtensionReason("");
    setExtensionPicker("");
  };

  const currentExtensionEnd = extensionBooking
    ? getBookingReturnDateTime(extensionBooking)
    : null;
  const selectedExtensionEnd = combineExtensionDateTime(extensionDate, extensionTime);
  const extensionTimingError = extensionBooking
    ? !currentExtensionEnd
      ? "The current return schedule is unavailable. Refresh and try again."
      : !selectedExtensionEnd || selectedExtensionEnd <= currentExtensionEnd
      ? "New return date and time must be after the current return schedule."
      : ""
    : "";

  const handleExtensionPickerChange = (event, value) => {
    const activePicker = extensionPicker;
    if (Platform.OS !== "ios") setExtensionPicker("");
    if (event?.type === "dismissed" || !value) return;

    if (activePicker === "date") {
      setExtensionDate(value);
      return;
    }

    if (activePicker === "time") {
      setExtensionTime(value);
    }
  };

  const submitExtensionRequest = async () => {
    const bookingId = getBookingId(extensionBooking);
    if (!bookingId || extensionTimingError || !selectedExtensionEnd) return;

    try {
      setExtensionSubmitting(true);
      const response = await requestBookingExtension(bookingId, {
        newEndDate: formatDateInput(selectedExtensionEnd),
        newEndTime: formatTimeInput(selectedExtensionEnd),
        reason: extensionReason.trim(),
      });

      setExtensionBooking(null);
      setExtensionDate(null);
      setExtensionTime(null);
      setExtensionReason("");
      setExtensionPicker("");
      await loadBookings("refresh");
      Alert.alert(
        "Extension requested",
        response?.message || "Your extension request has been submitted for review."
      );
    } catch (err) {
      Alert.alert(
        "Extension request failed",
        getFriendlyApiErrorMessage(err, "Unable to submit the extension request. Please try again.")
      );
    } finally {
      setExtensionSubmitting(false);
    }
  };

  const openAdditionalInvoice = async (booking) => {
    const bookingId = getBookingId(booking);
    if (!bookingId || additionalInvoiceOpeningId) return;

    const details = getAdditionalPaymentDetails(booking);
    try {
      setAdditionalInvoiceOpeningId(bookingId);
      await openPdf({
        source: getAdditionalInvoicePdf(bookingId),
        fileName: `FleetX-Additional-Invoice-${
          details.invoiceReference || getReferenceNo(booking) || bookingId
        }.pdf`,
        title: "Additional Invoice",
        bookingReference: getReferenceNo(booking),
        documentReference: details.documentReference,
        type: "additional_invoice",
      });
    } catch (error) {
      showPdfError(error, "Unable to open the additional invoice. Please try again.");
    } finally {
      setAdditionalInvoiceOpeningId("");
    }
  };

  const openDocumentScreen = (type, booking) => {
    const routeName = type === "invoice" ? "BookingInvoice" : "BookingReceipt";
    const params = { booking };
    const parentNavigation = navigation.getParent?.();

    if (parentNavigation?.navigate) {
      parentNavigation.navigate(routeName, params);
      return;
    }

    navigation.navigate(routeName, params);
  };

  const openPaymentInstructions = (booking) => {
    const params = { booking };
    const parentNavigation = navigation.getParent?.();

    if (parentNavigation?.navigate) {
      parentNavigation.navigate("PaymentInstructions", params);
      return;
    }

    navigation.navigate("PaymentInstructions", params);
  };

  const openBookedVehicleDetails = (booking) => {
    const params = { booking };
    const parentNavigation = navigation.getParent?.();

    if (parentNavigation?.navigate) {
      parentNavigation.navigate("BookedVehicleDetails", params);
      return;
    }

    navigation.navigate("BookedVehicleDetails", params);
  };

  const renderActions = (item) => {
    const meta = getBookingStatusMeta(item);
    if (meta.key === "in_progress") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleResume(item)}>
            <Text style={styles.actionButtonText}>Continue Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => navigation.navigate("Verification")}
          >
            <Text style={styles.secondaryActionText}>Verification</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (shouldShowPaymentPanel(item)) {
      const hasInvoiceDocument = Boolean(getInvoicePdfSource(item));

      return (
        <View style={styles.paymentPanel}>
          <Text style={styles.panelTitle}>Invoice and payment</Text>
          <Text style={styles.panelText}>
            Review your payment method, references, invoice, and proof upload steps in one place.
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openPaymentInstructions(item)}
            >
              <Text style={styles.actionButtonText}>
                {canSubmitPayment(item) ? "View Payment Instructions" : "Payment Details"}
              </Text>
            </TouchableOpacity>
            {hasInvoiceDocument ? (
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={() => openDocumentScreen("invoice", item)}
              >
                <Text style={styles.secondaryActionText}>View Invoice</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {!canSubmitPayment(item) ? (
            <Text style={styles.panelText}>
              Payment instructions will become actionable once FleetX issues the invoice for this booking.
            </Text>
          ) : null}
        </View>
      );
    }

    if (meta.key === "under_review") {
      return <Text style={styles.helperText}>Waiting for FleetX admin review.</Text>;
    }

    if (["confirmed", "completed"].includes(meta.key)) {
      const receiptDetails = getBookingReceiptDetails(item);
      const hasReceiptDocument = Boolean(getReceiptPdfSource(item)) && receiptDetails.isEligible;
      const hasInvoiceDocument = Boolean(getInvoicePdfSource(item));

      return (
        <View style={styles.actionRow}>
          {hasReceiptDocument ? (
            <TouchableOpacity style={styles.actionButton} onPress={() => openDocumentScreen("receipt", item)}>
              <Text style={styles.actionButtonText}>View Receipt</Text>
            </TouchableOpacity>
          ) : null}
          {hasInvoiceDocument ? (
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => openDocumentScreen("invoice", item)}>
              <Text style={styles.secondaryActionText}>View Invoice</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    if (isHistoryBooking(item) && !["completed"].includes(meta.key)) {
      return (
        <Text style={styles.helperText}>
          {item?.cancellationReason || item?.adminRemarks || meta.nextAction}
        </Text>
      );
    }

    return null;
  };

  const renderExtensionAction = (item) => {
    const extensionState = getExtensionState(item);
    const canRequest = canRequestExtension(item);

    if (!extensionState.label && !canRequest) return null;

    return (
      <View style={styles.extensionPanel}>
        {extensionState.label ? (
          <View style={styles.extensionStatusRow}>
            <Ionicons
              name={extensionState.isPending ? "time-outline" : "information-circle-outline"}
              size={16}
              color={extensionState.isPending ? "#b45309" : "#0369a1"}
            />
            <Text
              style={[
                styles.extensionStatusText,
                extensionState.isPending && styles.extensionStatusPending,
              ]}
            >
              {extensionState.label}
            </Text>
          </View>
        ) : null}
        {canRequest ? (
          <TouchableOpacity
            style={styles.extensionButton}
            onPress={() => openExtensionModal(item)}
          >
            <Text style={styles.extensionButtonText}>Request Extension</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderAdditionalInvoicePanel = (item) => {
    const details = getAdditionalPaymentDetails(item);
    if (!details.required) return null;

    const rows = [
      details.invoiceReference
        ? { label: "Invoice Reference", value: details.invoiceReference }
        : null,
      details.reason ? { label: "Reason", value: details.reason } : null,
      details.amount > 0
        ? {
            label: "Additional Amount",
            value: `PHP ${details.amount.toLocaleString()}`,
          }
        : null,
      details.status ? { label: "Status", value: details.status } : null,
      details.paymentDueAt
        ? { label: "Payment Due", value: formatDateTime(details.paymentDueAt) }
        : null,
      details.invoiceIssuedAt
        ? { label: "Invoice Issued", value: formatDateTime(details.invoiceIssuedAt) }
        : null,
    ].filter(Boolean);
    const bookingId = getBookingId(item);
    const isOpening = additionalInvoiceOpeningId === bookingId;

    return (
      <View style={styles.additionalInvoicePanel}>
        <Text style={styles.additionalInvoiceTitle}>Additional Invoice</Text>
        <Text style={styles.additionalInvoiceSubtitle}>
          Review the additional charges and payment deadline separately from your original invoice.
        </Text>
        {rows.map((row) => (
          <View key={row.label} style={styles.additionalInvoiceRow}>
            <Text style={styles.additionalInvoiceLabel}>{row.label}</Text>
            <Text style={styles.additionalInvoiceValue}>{row.value}</Text>
          </View>
        ))}
        <TouchableOpacity
          style={[
            styles.additionalInvoiceButton,
            isOpening && styles.actionButtonDisabled,
          ]}
          onPress={() => openAdditionalInvoice(item)}
          disabled={isOpening}
        >
          {isOpening ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.additionalInvoiceButtonText}>View Additional Invoice</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderBooking = ({ item }) => {
    const meta = getBookingStatusMeta(item);
    const historyBooking = isHistoryBooking(item);
    const nextAction = getBookingNextAction(item);
    const invoiceDetails = getBookingInvoicePaymentDetails(item);
    const amountValue =
      meta.key === "awaiting_payment" && invoiceDetails.amountDue > 0
        ? invoiceDetails.amountDue
        : Number(item?.totalPrice || invoiceDetails.bookingTotal || 0);
    const amountLabel = getBookingAmountLabel(item);
    const bookingId = getBookingId(item);
    const imageUrl = getVehicleImageUrl(item);
    const imageKey = `booking-${bookingId}`;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => openBookedVehicleDetails(item)}
        >
          {imageUrl && !failedImages[imageKey] ? (
            <Image
              key={`${bookingId || "booking"}-${imageUrl}`}
              source={{ uri: imageUrl }}
              style={styles.carImage}
              onError={() => setFailedImages((prev) => ({ ...prev, [imageKey]: true }))}
            />
          ) : (
            <View style={styles.carImageFallback}>
              <Text style={styles.carImageFallbackText}>Car</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <TouchableOpacity
              style={styles.vehicleInfo}
              activeOpacity={0.8}
              onPress={() => openBookedVehicleDetails(item)}
            >
              <Text style={styles.vehicleName} numberOfLines={1}>
                {getVehicleName(item)}
              </Text>
              <Text style={styles.bookingCode}>{getReferenceNo(item)}</Text>
            </TouchableOpacity>

            <View style={[styles.statusBadge, styles[`statusBadge_${meta.tone}`]]}>
              <Text style={styles.statusText}>{meta.label}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openBookedVehicleDetails(item)}
          >
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#f97316" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item?.destination || item?.vehicleId?.location || "No destination"}
              </Text>
            </View>

            <Text style={styles.dateText}>
              {formatDate(item?.startDate)} to {formatDate(item?.endDate)} - {getDays(item?.startDate, item?.endDate)}
            </Text>
          </TouchableOpacity>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.totalText}>
                {amountLabel}: PHP {Number(amountValue || 0).toLocaleString()}
              </Text>
              <Text style={styles.paymentText}>
                Payment: <Text style={styles.paymentSubmitted}>{getPaymentLabel(item)}</Text>
              </Text>
            </View>
            {!historyBooking && canCancelBooking(item) ? (
              <TouchableOpacity onPress={() => handleCancel(item)}>
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.statusSubtext}>{historyBooking ? meta.nextAction : nextAction}</Text>
          {renderActions(item)}
          {renderExtensionAction(item)}
          {renderAdditionalInvoicePanel(item)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack?.()}>
            <Ionicons name="chevron-back" size={22} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.title}>My Bookings</Text>
        </View>

        <FlatList
          style={styles.filterList}
          horizontal
          data={viewTabs}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.viewTabsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.viewTab, activeView === item.key && styles.viewTabActive]}
              onPress={() => setActiveView(item.key)}
            >
              <Text style={[styles.viewTabText, activeView === item.key && styles.viewTabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        <FlatList
          style={styles.filterList}
          horizontal
          data={availableFilters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterButton, activeFilter === item.key && styles.activeFilterButton]}
              onPress={() => setActiveFilter(item.key)}
            >
              <Text
                style={[styles.filterText, activeFilter === item.key && styles.activeFilterText]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : !hasToken ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Sign in to view bookings</Text>
            <Text style={styles.emptyText}>
              Browse vehicles and plan trips as a guest, then sign in to manage confirmed bookings.
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={() => navigation.navigate("ClientLogin")}>
              <Text style={styles.refreshText}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshButton} onPress={() => navigation.navigate("RegisterClient")}>
              <Text style={styles.refreshText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredBookings}
            keyExtractor={(item, index) => getBookingId(item) || String(index)}
            renderItem={renderBooking}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadBookings("refresh")} />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>
                  {activeView === "history" ? "No booking history yet." : "No active bookings yet."}
                </Text>
                <Text style={styles.emptyText}>
                  {activeView === "history"
                    ? "Completed and cancelled bookings will appear here."
                    : "Plan a trip or browse vehicles to start a booking."}
                </Text>
                <TouchableOpacity style={styles.refreshButton} onPress={() => loadBookings("refresh")}>
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      <Modal
        visible={Boolean(extensionBooking)}
        transparent
        animationType="slide"
        onRequestClose={closeExtensionModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.extensionModalSheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.extensionModalHeader}>
                <View style={styles.extensionModalHeading}>
                  <Text style={styles.extensionModalTitle}>Request Extension</Text>
                  <Text style={styles.extensionModalSubtitle}>
                    FleetX will review the new return schedule and issue additional charges if approved.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.extensionModalClose}
                  onPress={closeExtensionModal}
                  disabled={extensionSubmitting}
                >
                  <Ionicons name="close" size={22} color="#475569" />
                </TouchableOpacity>
              </View>

              <View style={styles.currentReturnCard}>
                <Text style={styles.extensionFieldLabel}>Current Return</Text>
                <Text style={styles.currentReturnValue}>
                  {formatDateTime(currentExtensionEnd)}
                </Text>
              </View>

              <View style={styles.extensionFieldRow}>
                <TouchableOpacity
                  style={styles.extensionFieldButton}
                  onPress={() => setExtensionPicker("date")}
                >
                  <Text style={styles.extensionFieldLabel}>New Return Date</Text>
                  <Text style={styles.extensionFieldValue}>
                    {extensionDate ? formatDate(extensionDate) : "Select date"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.extensionFieldButton}
                  onPress={() => setExtensionPicker("time")}
                >
                  <Text style={styles.extensionFieldLabel}>New Return Time</Text>
                  <Text style={styles.extensionFieldValue}>{formatTime(extensionTime)}</Text>
                </TouchableOpacity>
              </View>

              {extensionPicker ? (
                <View style={styles.extensionPickerWrap}>
                  <DateTimePicker
                    value={extensionPicker === "date" ? extensionDate || new Date() : extensionTime || new Date()}
                    mode={extensionPicker}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={extensionPicker === "date" ? currentExtensionEnd || new Date() : undefined}
                    minuteInterval={30}
                    onChange={handleExtensionPickerChange}
                  />
                  {Platform.OS === "ios" ? (
                    <TouchableOpacity
                      style={styles.extensionPickerDone}
                      onPress={() => setExtensionPicker("")}
                    >
                      <Text style={styles.extensionPickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              <Text style={styles.extensionFieldLabel}>Reason (Optional)</Text>
              <TextInput
                style={styles.extensionReasonInput}
                value={extensionReason}
                onChangeText={setExtensionReason}
                placeholder="Tell FleetX why you need more time"
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={500}
                textAlignVertical="top"
              />

              {extensionTimingError ? (
                <Text style={styles.extensionValidationText}>{extensionTimingError}</Text>
              ) : (
                <Text style={styles.extensionHelperText}>
                  The new return schedule is after your current return time.
                </Text>
              )}

              <View style={styles.extensionModalActions}>
                <TouchableOpacity
                  style={styles.extensionModalCancel}
                  onPress={closeExtensionModal}
                  disabled={extensionSubmitting}
                >
                  <Text style={styles.extensionModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.extensionModalSubmit,
                    (Boolean(extensionTimingError) || extensionSubmitting) &&
                      styles.actionButtonDisabled,
                  ]}
                  onPress={submitExtensionRequest}
                  disabled={Boolean(extensionTimingError) || extensionSubmitting}
                >
                  {extensionSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.extensionModalSubmitText}>Submit Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}
