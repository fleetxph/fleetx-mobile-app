import { Alert, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  cancelClientBooking,
  getAdditionalInvoice,
  getAdditionalInvoicePdf,
  uploadAdditionalPaymentProof,
} from "../api/clientApi";
import { styles } from "../styles/bookedVehicleDetailsStyle";
import { getBookingActionState } from "../utils/bookingActions";
import { getBookingNextAction, getBookingStatusMeta, isHistoryBooking } from "../utils/bookingStatusDisplay";
import {
  formatBookingDate,
  formatBookingDateTime,
  formatBookingPrice,
  getInvoicePdfSource,
  getReferenceNo,
  getVehicleImageUrl,
  getVehicleName,
} from "../utils/bookingDocuments";
import {
  getBookingCustomerStatusCopy,
  getBookingInvoicePaymentDetails,
  getBookingReceiptDetails,
  isAwaitingPaymentBooking,
} from "../utils/bookingPaymentDisplay";
import { openPdf, showPdfError } from "../utils/pdfUtils";

function getVehicle(booking) {
  return booking?.vehicleId || booking?.vehicle || {};
}

function valueOrDash(value) {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
}

function firstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function getObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toBase64DataUri(asset) {
  if (!asset?.base64) return "";
  const mimeType = asset.mimeType || "image/jpeg";
  return `data:${mimeType};base64,${asset.base64}`;
}

function getAdditionalInvoiceRecord(payload = {}) {
  const candidates = [
    getObject(payload?.additionalInvoice),
    getObject(payload?.data?.additionalInvoice),
    getObject(payload?.invoice),
    getObject(payload?.data?.invoice),
    getObject(payload?.data),
    getObject(payload),
  ];

  return candidates.find((candidate) => Object.keys(candidate).length > 0) || {};
}

function getAdditionalInvoicePatch(payload = {}) {
  const invoiceRecord = getAdditionalInvoiceRecord(payload);
  const hasInvoiceRecord = Object.keys(invoiceRecord).length > 0;
  const additionalPaymentStatus = firstPresent(
    payload?.additionalPaymentStatus,
    payload?.data?.additionalPaymentStatus,
    invoiceRecord?.additionalPaymentStatus,
    invoiceRecord?.paymentStatus,
    invoiceRecord?.status
  );
  const additionalPaymentProofUrl = firstPresent(
    payload?.additionalPaymentProofUrl,
    payload?.data?.additionalPaymentProofUrl,
    invoiceRecord?.additionalPaymentProofUrl,
    invoiceRecord?.paymentProofUrl
  );
  const additionalInvoiceUrl = firstPresent(
    payload?.additionalInvoiceUrl,
    payload?.additionalInvoicePdfUrl,
    payload?.data?.additionalInvoiceUrl,
    payload?.data?.additionalInvoicePdfUrl,
    invoiceRecord?.invoiceUrl,
    invoiceRecord?.invoicePdfUrl,
    invoiceRecord?.pdfUrl,
    invoiceRecord?.documentUrl,
    invoiceRecord?.url
  );

  return {
    ...(hasInvoiceRecord ? { additionalInvoice: invoiceRecord, additionalInvoiceData: invoiceRecord } : {}),
    ...(additionalPaymentStatus ? { additionalPaymentStatus } : {}),
    ...(additionalPaymentProofUrl ? { additionalPaymentProofUrl } : {}),
    ...(additionalInvoiceUrl
      ? { additionalInvoiceUrl, additionalInvoicePdfUrl: additionalInvoiceUrl }
      : {}),
  };
}

function DetailItem({ label, value }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {valueOrDash(value)}
      </Text>
    </View>
  );
}

function SummaryRow({ label, value, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{valueOrDash(value)}</Text>
    </View>
  );
}

function renderConditionalSummaryRows(rows = []) {
  const visibleRows = rows.filter((row) => row && row.value !== undefined && row.value !== null && row.value !== "");

  return visibleRows.map((row, index) => (
    <SummaryRow
      key={`${row.label}-${index}`}
      label={row.label}
      value={row.value}
      last={index === visibleRows.length - 1}
    />
  ));
}

export default function BookedVehicleDetails({ navigation, route }) {
  const [booking, setBooking] = useState(route?.params?.booking || {});
  const [imageFailed, setImageFailed] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [additionalInvoiceLoading, setAdditionalInvoiceLoading] = useState(false);
  const [additionalPaymentProofAsset, setAdditionalPaymentProofAsset] = useState(null);
  const [additionalPaymentSubmitting, setAdditionalPaymentSubmitting] = useState(false);
  const vehicle = getVehicle(booking);
  const meta = getBookingStatusMeta(booking);
  const actionState = getBookingActionState(booking);
  const additionalInvoice = actionState.additionalInvoice;
  const bookingRef = getReferenceNo(booking);
  const isClosedHistory = isHistoryBooking(booking) && meta.key !== "completed";
  const isPaymentDue =
    isAwaitingPaymentBooking(booking) && !["confirmed", "completed", "cancelled", "rejected", "expired", "archived", "closed"].includes(meta.key);
  const paymentDetails = getBookingInvoicePaymentDetails(booking);
  const receiptDetails = getBookingReceiptDetails(booking);
  const hasInvoiceDocument = Boolean(getInvoicePdfSource(booking));
  const hasReceiptDocument = actionState.canViewReceipt;
  const statusCopy = getBookingCustomerStatusCopy(booking);
  const nextAction = getBookingNextAction(booking);
  const showInvoiceActionCard = ["awaiting_payment", "under_review"].includes(meta.key);
  const statusTitle = isClosedHistory
    ? "Booking no longer active"
    : meta.label;
  const statusMessage = isClosedHistory
    ? meta.nextAction
    : nextAction || statusCopy || "This vehicle is reserved for your booking.";
  const imageUrl = getVehicleImageUrl(booking);
  const additionalChargeRows = useMemo(
    () =>
      additionalInvoice.chargeBreakdown
        .filter((item) => item && (item.label || item.amount > 0 || item.description))
        .map((item, index) => ({
          key: `${item.label || "charge"}-${index}`,
          label: item.label || `Charge ${index + 1}`,
          value: item.amount > 0 ? formatBookingPrice(item.amount) : item.description || "-",
          description: item.amount > 0 && item.description ? item.description : "",
        })),
    [additionalInvoice.chargeBreakdown]
  );

  const loadAdditionalInvoiceDetails = async ({ showLoader = false } = {}) => {
    if (!actionState.bookingId) return null;

    try {
      if (showLoader) setAdditionalInvoiceLoading(true);
      const response = await getAdditionalInvoice(actionState.bookingId);
      const patch = getAdditionalInvoicePatch(response || {});

      if (Object.keys(patch).length) {
        setBooking((prev) => ({
          ...prev,
          ...patch,
          additionalInvoice: {
            ...(prev?.additionalInvoice || {}),
            ...(patch.additionalInvoice || {}),
          },
          additionalInvoiceData: {
            ...(prev?.additionalInvoiceData || {}),
            ...(patch.additionalInvoiceData || {}),
          },
        }));
      }

      return response;
    } catch (error) {
      if (__DEV__) {
        console.log("[AdditionalInvoice][fetch]", {
          success: false,
          status: error?.response?.status || null,
          message: error?.response?.data?.message || error?.message || "Unknown error",
        });
      }

      return null;
    } finally {
      if (showLoader) setAdditionalInvoiceLoading(false);
    }
  };

  useEffect(() => {
    if (!actionState.bookingId) return;

    loadAdditionalInvoiceDetails();
  }, [actionState.bookingId]);

  const openDocument = (type) => {
    navigation.navigate(type === "invoice" ? "BookingInvoice" : "BookingReceipt", {
      booking,
    });
  };

  const openPaymentInstructions = () => {
    navigation.navigate("PaymentInstructions", { booking });
  };

  const openAdditionalInvoice = () => {
    if (!actionState.bookingId) return;

    openPdf({
      source: additionalInvoice.documentUrl || getAdditionalInvoicePdf(actionState.bookingId),
      fileName: `FleetX-Additional-Invoice-${bookingRef || actionState.bookingId}.pdf`,
      title: "Additional Invoice",
      bookingReference: bookingRef,
      documentReference: additionalInvoice.invoiceNumber || booking?.invoiceReference || booking?.invoiceNumber,
      type: "invoice",
    }).catch((error) => {
      showPdfError(error, "Unable to open the additional invoice. Please try again.");
    });
  };

  const pickAdditionalPaymentProof = async (source) => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to upload additional payment proof.");
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

    setAdditionalPaymentProofAsset(asset);
  };

  const openAdditionalPaymentProofPicker = () => {
    if (!actionState.canUploadAdditionalPaymentProof || additionalPaymentSubmitting) return;

    Alert.alert("Upload additional payment proof", "Choose how you want to add the receipt image.", [
      { text: "Camera", onPress: () => pickAdditionalPaymentProof("camera") },
      { text: "Gallery", onPress: () => pickAdditionalPaymentProof("gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeSelectedAdditionalPaymentProof = () => {
    setAdditionalPaymentProofAsset(null);
  };

  const handleSubmitAdditionalPaymentProof = async () => {
    if (!actionState.bookingId || !additionalPaymentProofAsset?.base64) {
      Alert.alert("Upload required", "Please select your additional payment proof first.");
      return;
    }

    try {
      setAdditionalPaymentSubmitting(true);
      const paymentProof = toBase64DataUri(additionalPaymentProofAsset);
      const response = await uploadAdditionalPaymentProof(actionState.bookingId, {
        paymentProof,
        replaceExisting: Boolean(additionalInvoice.additionalPaymentProofUrl),
      });
      const updatedBooking =
        response?.booking || response?.updatedBooking || response?.data?.booking || null;

      if (updatedBooking) {
        setBooking((prev) => ({ ...prev, ...updatedBooking }));
      } else {
        await loadAdditionalInvoiceDetails({ showLoader: false });
        setBooking((prev) => ({
          ...prev,
          additionalPaymentStatus: firstPresent(
            response?.additionalPaymentStatus,
            response?.status,
            response?.paymentStatus,
            "submitted"
          ),
          additionalPaymentProofUrl:
            firstPresent(response?.additionalPaymentProofUrl, response?.proofUrl) ||
            prev?.additionalPaymentProofUrl,
        }));
      }

      setAdditionalPaymentProofAsset(null);
      Alert.alert("Proof submitted", "Your additional payment proof has been submitted for review.");
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error?.response?.data?.message || error?.message || "Unable to submit additional payment proof."
      );
    } finally {
      setAdditionalPaymentSubmitting(false);
    }
  };

  const handleCancelBooking = () => {
    if (!actionState.canCancelBooking || cancelLoading) return;

    const bookingId = actionState.bookingId;

    if (__DEV__) {
      console.log("[BookingCancel][request]", {
        bookingIdSource: booking?._id
          ? "booking._id"
          : booking?.id
          ? "booking.id"
          : booking?.bookingId
          ? "booking.bookingId"
          : "unknown",
        status: booking?.status || booking?.bookingStatus || "",
      });
    }

    Alert.alert(
      "Cancel booking?",
      "This will close your booking request. You can create a new booking if your plans change.",
      [
        {
          text: "Keep Booking",
          style: "cancel",
        },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelLoading(true);
              const response = await cancelClientBooking(bookingId, {});
              const updatedBooking =
                response?.booking || response?.updatedBooking || response?.data?.booking || null;

              if (__DEV__) {
                console.log("[BookingCancel][response]", {
                  success: true,
                  status:
                    updatedBooking?.status ||
                    response?.status ||
                    "cancelled",
                });
              }

              setBooking((prev) => ({
                ...prev,
                ...(updatedBooking || {}),
                status: updatedBooking?.status || "cancelled",
                bookingStatus: updatedBooking?.bookingStatus || "cancelled",
                cancellationReason:
                  updatedBooking?.cancellationReason ||
                  prev?.cancellationReason ||
                  "Cancelled from mobile app.",
              }));
            } catch (err) {
              if (__DEV__) {
                console.log("[BookingCancel][response]", {
                  success: false,
                  status: err?.response?.status || null,
                });
              }
              Alert.alert(
                "Cancel failed",
                err?.response?.data?.message || err?.message || "Please try again."
              );
            } finally {
              setCancelLoading(false);
            }
          },
        },
      ]
    );
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
          <View>
            <Text style={styles.title}>Booked Vehicle</Text>
            <Text style={styles.subtitle}>{bookingRef}</Text>
          </View>
        </View>

        <View style={styles.imageCard}>
          {imageUrl && !imageFailed ? (
            <Image
              key={`${booking?._id || booking?.id || "booking"}-${imageUrl}`}
              source={{ uri: imageUrl }}
              style={styles.vehicleImage}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View style={styles.vehicleImageFallback}>
              <Text style={styles.vehicleImageFallbackText}>FleetDrive</Text>
            </View>
          )}
          <View style={styles.imageFooter}>
            <Text style={styles.vehicleName}>{getVehicleName(booking)}</Text>
            <Text style={styles.vehicleMeta}>
              {valueOrDash(vehicle?.category || booking?.vehicleCategory)} - {valueOrDash(vehicle?.plateNo || vehicle?.plateNumber)}
            </Text>
          </View>
        </View>

        <View style={styles.statusPanel}>
          <View style={styles.statusTop}>
            <Text style={styles.statusTitle}>{statusTitle}</Text>
            <View style={[styles.badge, styles[`badge_${meta.tone}`]]}>
              <Text style={styles.badgeText}>{meta.label}</Text>
            </View>
          </View>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booking Actions</Text>

          {actionState.canReviewContract ? (
            <View style={styles.actionCard}>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>
                  {actionState.contractState.contractAccepted ? "Rental Contract" : "Review Rental Contract"}
                </Text>
                <Text style={styles.actionText}>
                  {actionState.contractState.contractAccepted
                    ? "Your rental contract has been accepted. You can review it anytime."
                    : "Please review and accept the rental contract before uploading payment proof."}
                </Text>
              </View>
              <TouchableOpacity style={styles.secondaryButton} onPress={openPaymentInstructions}>
                <Text style={styles.secondaryButtonText}>
                  {actionState.contractState.contractAccepted ? "View Contract" : "Review Contract"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {showInvoiceActionCard && actionState.canViewInvoice ? (
            <View style={styles.actionCard}>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Invoice and Payment Details</Text>
                <Text style={styles.actionText}>
                  {meta.key === "awaiting_payment"
                    ? "Review your invoice and payment details before submitting proof."
                    : "Open the invoice and payment details for this booking."}
                </Text>
              </View>
              <View style={styles.actionButtonRow}>
                {hasInvoiceDocument ? (
                  <TouchableOpacity style={styles.secondaryButtonCompact} onPress={() => openDocument("invoice")}>
                    <Text style={styles.secondaryButtonText}>View Invoice</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.primaryButtonCompact} onPress={openPaymentInstructions}>
                  <Text style={styles.primaryButtonText}>Payment Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {(actionState.canUploadPaymentProof ||
            actionState.proofState.isUnderReview ||
            (actionState.contractState.requiresContract && !actionState.contractState.contractAccepted)) ? (
            <View style={styles.actionCard}>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Payment Proof</Text>
                <Text style={styles.actionText}>
                  {actionState.proofState.isUnderReview
                    ? "Your payment proof is being reviewed."
                    : actionState.contractState.requiresContract && !actionState.contractState.contractAccepted
                    ? "Please review and accept the rental contract before uploading payment proof."
                    : "Upload your payment proof once your transfer is complete."}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  actionState.canUploadPaymentProof ? styles.primaryButtonCompact : styles.secondaryButtonCompact,
                  !actionState.canUploadPaymentProof && styles.disabledButton,
                ]}
                onPress={openPaymentInstructions}
              >
                <Text
                  style={
                    actionState.canUploadPaymentProof
                      ? styles.primaryButtonText
                      : styles.secondaryButtonText
                  }
                >
                  {actionState.proofState.isUnderReview
                    ? "View Payment Proof Status"
                    : actionState.canUploadPaymentProof
                    ? "Upload Payment Proof"
                    : "Contract Required"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {actionState.canViewReceipt ? (
            <View style={styles.actionCard}>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Receipt</Text>
                <Text style={styles.actionText}>
                  Your booking is confirmed. Open the official receipt issued for this booking.
                </Text>
              </View>
              <TouchableOpacity style={styles.primaryButtonCompact} onPress={() => openDocument("receipt")}>
                <Text style={styles.primaryButtonText}>View Receipt</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {actionState.additionalInvoice.hasAdditionalBalance ? (
            <View style={styles.actionCard}>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Additional Invoice</Text>
                <Text style={styles.actionText}>
                  {additionalInvoice.helperText ||
                    "There are additional charges for this booking. Please review the invoice and upload proof of payment."}
                </Text>
                {renderConditionalSummaryRows([
                  additionalInvoice.invoiceNumber
                    ? { label: "Invoice Reference", value: additionalInvoice.invoiceNumber }
                    : null,
                  additionalInvoice.amountDue > 0
                    ? {
                        label: "Additional Amount Due",
                        value: formatBookingPrice(additionalInvoice.amountDue),
                      }
                    : null,
                  additionalInvoice.reason
                    ? { label: "Reason", value: additionalInvoice.reason }
                    : null,
                  additionalInvoice.statusLabel
                    ? { label: "Status", value: additionalInvoice.statusLabel }
                    : null,
                  additionalInvoice.dueDate
                    ? {
                        label: "Due Date",
                        value: formatBookingDateTime(additionalInvoice.dueDate),
                      }
                    : null,
                ])}
                {additionalChargeRows.length ? (
                  <View style={styles.noticeCard}>
                    <Text style={styles.noticeLabel}>Charge Breakdown</Text>
                    {additionalChargeRows.map((item) => (
                      <View key={item.key} style={styles.breakdownRow}>
                        <View style={styles.breakdownCopy}>
                          <Text style={styles.breakdownLabel}>{item.label}</Text>
                          {item.description ? (
                            <Text style={styles.breakdownDescription}>{item.description}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.breakdownValue}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={styles.actionButtonRow}>
                {actionState.canViewAdditionalInvoice ? (
                  <TouchableOpacity style={styles.secondaryButtonCompact} onPress={openAdditionalInvoice}>
                    <Text style={styles.secondaryButtonText}>View Additional Invoice</Text>
                  </TouchableOpacity>
                ) : null}
                {actionState.canUploadAdditionalPaymentProof ? (
                  <TouchableOpacity style={styles.accentButtonCompact} onPress={openAdditionalPaymentProofPicker}>
                    <Text style={styles.accentButtonText}>
                      {additionalPaymentProofAsset ? "Replace Additional Proof" : "Upload Additional Payment Proof"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {additionalInvoiceLoading ? (
                <Text style={styles.helperText}>Loading additional invoice details...</Text>
              ) : null}
              {additionalPaymentProofAsset?.uri ? (
                <View style={styles.proofPreviewCard}>
                  <Image source={{ uri: additionalPaymentProofAsset.uri }} style={styles.proofPreviewImage} />
                  <Text style={styles.assetName} numberOfLines={1}>
                    {additionalPaymentProofAsset.fileName || additionalPaymentProofAsset.uri.split("/").pop()}
                  </Text>
                  <View style={styles.actionButtonRow}>
                    <TouchableOpacity
                      style={styles.secondaryButtonCompact}
                      onPress={openAdditionalPaymentProofPicker}
                    >
                      <Text style={styles.secondaryButtonText}>Replace Proof</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryButtonCompact}
                      onPress={removeSelectedAdditionalPaymentProof}
                    >
                      <Text style={styles.secondaryButtonText}>Remove Proof</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.accentButtonCompact, additionalPaymentSubmitting && styles.disabledButton]}
                    onPress={handleSubmitAdditionalPaymentProof}
                    disabled={additionalPaymentSubmitting}
                  >
                    <Text style={styles.accentButtonText}>
                      {additionalPaymentSubmitting ? "Submitting..." : "Submit Additional Payment Proof"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {additionalInvoice.statusKey === "under_review" ? (
                <Text style={styles.helperText}>Additional payment proof is being reviewed.</Text>
              ) : null}
              {additionalInvoice.statusKey === "paid" ? (
                <Text style={styles.helperText}>Additional payment verified.</Text>
              ) : null}
              {additionalInvoice.statusKey === "rejected" && !actionState.canUploadAdditionalPaymentProof ? (
                <Text style={styles.helperText}>
                  Additional payment proof needs to be uploaded again.
                </Text>
              ) : null}
              {!actionState.canUploadAdditionalPaymentProof &&
              !["under_review", "paid", "rejected"].includes(additionalInvoice.statusKey) ? (
                <>
                  <Text style={styles.helperText}>
                    Review the additional invoice for the latest payment instructions.
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}

          {isClosedHistory && !actionState.additionalInvoice.hasAdditionalBalance ? (
            <Text style={styles.helperText}>Booking closed.</Text>
          ) : null}

          {actionState.canCancelBooking ? (
            <TouchableOpacity
              style={[styles.dangerButton, cancelLoading && styles.disabledButton]}
              onPress={handleCancelBooking}
              disabled={cancelLoading}
            >
              <Text style={styles.dangerButtonText}>
                {cancelLoading ? "Cancelling..." : "Cancel Booking"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          <View style={styles.detailGrid}>
            <DetailItem label="Seats" value={vehicle?.seats || vehicle?.seatCount || booking?.numberOfPax} />
            <DetailItem label="Transmission" value={vehicle?.transmission} />
            <DetailItem label="Fuel" value={vehicle?.fuelType || vehicle?.fuel} />
            <DetailItem label="Daily Rate" value={formatBookingPrice(vehicle?.dailyRate || booking?.dailyRate)} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <SummaryRow label="Reference" value={bookingRef} />
          <SummaryRow
            label="Trip Dates"
            value={`${formatBookingDate(booking?.startDate)} to ${formatBookingDate(booking?.endDate)}`}
          />
          <SummaryRow label="Destination" value={booking?.destination || booking?.pickupLocation} />
          <SummaryRow label="Payment Status" value={booking?.paymentStatus || "Not submitted"} />
          <SummaryRow label="Total Price" value={formatBookingPrice(booking?.totalPrice)} last />
        </View>

        {isPaymentDue || paymentDetails.hasInvoiceDetails ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Invoice and Payment</Text>
            {paymentDetails.hasInvoiceDetails ? (
              <>
                {renderConditionalSummaryRows([
                  paymentDetails.invoiceNumber
                    ? { label: "Invoice Number", value: paymentDetails.invoiceNumber }
                    : null,
                  paymentDetails.amountDue > 0
                    ? { label: "Amount Due", value: formatBookingPrice(paymentDetails.amountDue) }
                    : null,
                  paymentDetails.bookingTotal > 0
                    ? { label: "Booking Total", value: formatBookingPrice(paymentDetails.bookingTotal) }
                    : null,
                  paymentDetails.downPayment > 0
                    ? { label: "Down Payment", value: formatBookingPrice(paymentDetails.downPayment) }
                    : null,
                  paymentDetails.remainingBalance > 0
                    ? {
                        label: "Remaining Balance",
                        value: formatBookingPrice(paymentDetails.remainingBalance),
                      }
                    : null,
                  paymentDetails.paymentMethod
                    ? { label: "Payment Method", value: paymentDetails.paymentMethod }
                    : null,
                  paymentDetails.paymentOption
                    ? { label: "Payment Option", value: paymentDetails.paymentOption }
                    : null,
                  paymentDetails.bankName
                    ? { label: "Bank / Wallet", value: paymentDetails.bankName }
                    : null,
                  paymentDetails.accountName
                    ? { label: "Account Name", value: paymentDetails.accountName }
                    : null,
                  paymentDetails.accountNumber
                    ? { label: "Account Number", value: paymentDetails.accountNumber }
                    : null,
                  paymentDetails.eWalletNumber
                    ? { label: "E-Wallet Number", value: paymentDetails.eWalletNumber }
                    : null,
                  paymentDetails.dueDate
                    ? {
                        label: "Due Date",
                        value: formatBookingDateTime(paymentDetails.dueDate),
                      }
                    : null,
                ])}
                {paymentDetails.paymentInstructions ? (
                  <View style={styles.noticeCard}>
                    <Text style={styles.noticeLabel}>Payment Instructions</Text>
                    <Text style={styles.noticeText}>{paymentDetails.paymentInstructions}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.helperText}>
                Payment details will appear once your invoice is issued.
              </Text>
            )}
          </View>
        ) : null}

        {["confirmed", "completed"].includes(meta.key) && receiptDetails.isEligible ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Receipt and Confirmation</Text>
            <Text style={styles.helperText}>
              Your payment has been verified and your booking is confirmed.
            </Text>
            {renderConditionalSummaryRows([
              receiptDetails.receiptNumber
                ? { label: "Receipt Number", value: receiptDetails.receiptNumber }
                : null,
              receiptDetails.receiptIssuedAt
                ? {
                    label: "Receipt Issued",
                    value: formatBookingDateTime(receiptDetails.receiptIssuedAt),
                  }
                : null,
              receiptDetails.paymentVerifiedAt
                ? {
                    label: "Payment Verified",
                    value: formatBookingDateTime(receiptDetails.paymentVerifiedAt),
                  }
                : null,
              receiptDetails.amountPaid > 0
                ? { label: "Amount Paid", value: formatBookingPrice(receiptDetails.amountPaid) }
                : null,
              receiptDetails.paymentMethod
                ? { label: "Payment Method", value: receiptDetails.paymentMethod }
                : null,
              receiptDetails.paymentOption
                ? { label: "Payment Option", value: receiptDetails.paymentOption }
                : null,
              receiptDetails.bookingTotal > 0
                ? { label: "Booking Total", value: formatBookingPrice(receiptDetails.bookingTotal) }
                : null,
              getVehicleName(booking)
                ? { label: "Vehicle", value: getVehicleName(booking) }
                : null,
              booking?.startDate || booking?.endDate
                ? {
                    label: "Trip Dates",
                    value: `${formatBookingDate(booking?.startDate)} to ${formatBookingDate(booking?.endDate)}`,
                  }
                : null,
            ])}
          </View>
        ) : null}

        {hasReceiptDocument ? (
          <TouchableOpacity style={styles.primaryButton} onPress={() => openDocument("receipt")}>
            <Text style={styles.primaryButtonText}>View Receipt</Text>
          </TouchableOpacity>
        ) : null}
        {hasInvoiceDocument ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => openDocument("invoice")}>
            <Text style={styles.secondaryButtonText}>View Invoice</Text>
          </TouchableOpacity>
        ) : null}
        {isPaymentDue ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={openPaymentInstructions}>
            <Text style={styles.secondaryButtonText}>Payment Instructions</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Back to My Bookings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
