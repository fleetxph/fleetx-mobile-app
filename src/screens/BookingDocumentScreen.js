import { useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/bookingDocumentStyle";
import {
  formatBookingDate,
  formatBookingDateTime,
  formatBookingPrice,
  getBookingDocumentUrl,
  getBookingId,
  getReferenceNo,
  getVehicleName,
} from "../utils/bookingDocuments";
import { getBookingReceiptDetails } from "../utils/bookingPaymentDisplay";
import { downloadAndSharePdf, downloadPdf, sharePdf, showPdfError } from "../utils/pdfUtils";

function SummaryRow({ label, value, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "N/A"}</Text>
    </View>
  );
}

function shouldShowPaymentInstructions(booking) {
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.paymentStatus || "").toLowerCase();

  return (
    ["awaiting_payment", "pending_payment", "payment_rejected", "invoice_issued"].includes(status) ||
    ["invoice_issued", "submitted", "under_review", "reupload_required", "rejected"].includes(paymentStatus)
  );
}

export default function BookingDocumentScreen({ navigation, route, type }) {
  const booking = route?.params?.booking || {};
  const [pdfActionLoading, setPdfActionLoading] = useState("");
  const isInvoice = type === "invoice";
  const receiptDetails = getBookingReceiptDetails(booking);
  const title = isInvoice ? "Invoice" : "Receipt";
  const fileLabel = isInvoice ? "FleetX-Invoice" : "FleetX-Receipt";
  const reference = isInvoice
    ? booking?.invoiceReference || booking?.invoiceNumber || ""
    : booking?.receiptNumber || "";
  const bookingReference = getReferenceNo(booking);
  const previewUrl = getBookingDocumentUrl(booking, type, false);
  const pdfUrl = getBookingDocumentUrl(booking, type, true) || previewUrl;
  const isAvailable = isInvoice ? Boolean(previewUrl || pdfUrl) : Boolean((previewUrl || pdfUrl) && receiptDetails.isEligible);
  const fileName = `${fileLabel}-${bookingReference || reference || getBookingId(booking) || "document"}.pdf`;
  const documentSource = pdfUrl || previewUrl;
  const isBusy = Boolean(pdfActionLoading);

  const handlePdfAction = async (action) => {
    if (!documentSource) {
      Alert.alert("PDF Error", "PDF is not available yet. Please try again later.");
      return;
    }

    setPdfActionLoading(action);

    try {
      const payload = {
        source: documentSource,
        fileName,
        title,
        bookingReference,
        documentReference: reference,
        type,
      };

      if (action === "open") {
        await downloadAndSharePdf(payload);
      } else if (action === "download") {
        await downloadPdf(payload);
        Alert.alert("PDF Ready", "PDF ready. Choose where to save or open it.");
      } else {
        await sharePdf(payload);
      }
    } catch (error) {
      console.log("PDF action error:", {
        action,
        url: documentSource,
        message: error?.message || error,
      });
      showPdfError(error);
    } finally {
      setPdfActionLoading("");
    }
  };

  const getActionLabel = (action, defaultLabel) => {
    if (pdfActionLoading !== action) return defaultLabel;
    if (action === "open") return "Opening...";
    if (action === "download") return "Preparing PDF...";
    return "Sharing...";
  };

  const openPaymentInstructions = () => {
    navigation.navigate("PaymentInstructions", { booking });
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
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{getReferenceNo(booking)}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.docIcon}>
              <Ionicons
                name={isInvoice ? "document-text-outline" : "receipt-outline"}
                size={25}
                color="#F97316"
              />
            </View>
            <View
              style={[
                styles.statusPill,
                isAvailable ? styles.statusPillAvailable : styles.statusPillUnavailable,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isAvailable ? styles.statusTextAvailable : styles.statusTextUnavailable,
                ]}
              >
                {isAvailable ? "Available" : "Not Available"}
              </Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{reference || `${title} pending`}</Text>
          <Text style={styles.heroMeta}>
            {isInvoice
              ? `Payment status: ${booking?.paymentStatus || "Not submitted"}`
              : receiptDetails.isEligible
              ? "Your payment has been verified and your booking is confirmed."
              : "Receipt is not available until payment verification is complete."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>
          <SummaryRow label="Booking Ref" value={getReferenceNo(booking)} />
          <SummaryRow label="Vehicle" value={getVehicleName(booking)} />
          <SummaryRow
            label="Trip Dates"
            value={`${formatBookingDate(booking?.startDate)} to ${formatBookingDate(booking?.endDate)}`}
          />
          <SummaryRow
            label="Destination"
            value={booking?.destination || booking?.pickupLocation || booking?.vehicleId?.location}
          />
          <SummaryRow
            label="Total Amount"
            value={formatBookingPrice(booking?.invoiceAmount || booking?.totalPrice)}
          />
          {isInvoice ? (
            <SummaryRow label="Payment Deadline" value={formatBookingDateTime(booking?.paymentDueAt)} last />
          ) : (
            <SummaryRow label="Issued At" value={formatBookingDateTime(booking?.receiptIssuedAt)} last />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Document</Text>
          <View style={styles.documentBox}>
            <View style={styles.documentRow}>
              <View style={styles.fileIcon}>
                <Ionicons name="document-attach-outline" size={22} color="#F97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileTitle}>{isAvailable ? fileName : `${title} unavailable`}</Text>
                <Text style={styles.fileText}>
                  {isAvailable
                    ? "Open the backend-issued PDF document."
                    : `${title} is not available yet.`}
                </Text>
              </View>
            </View>
            {!isAvailable ? (
              <Text style={styles.unavailableText}>
                {isInvoice
                  ? "Invoice is not available yet. It will appear here once FleetX issues it for this booking."
                  : "Receipt is not available yet. It will appear here after your payment is verified and the booking is confirmed."}
              </Text>
            ) : null}
            {isBusy ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#F97316" />
                <Text style={styles.loadingText}>
                  {pdfActionLoading === "open"
                    ? "Opening PDF..."
                    : pdfActionLoading === "download"
                    ? "Preparing PDF..."
                    : "Sharing PDF..."}
                </Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!isAvailable || isBusy) && styles.disabledButton]}
            disabled={!isAvailable || isBusy}
            onPress={() => handlePdfAction("open")}
          >
            <Text
              style={[
                styles.primaryButtonText,
                (!isAvailable || isBusy) && styles.disabledButtonText,
              ]}
            >
              {getActionLabel("open", `Open ${title} PDF`)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, (!isAvailable || isBusy) && styles.disabledButton]}
            disabled={!isAvailable || isBusy}
            onPress={() => handlePdfAction("download")}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                (!isAvailable || isBusy) && styles.disabledButtonText,
              ]}
            >
              {getActionLabel("download", "Download PDF")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, (!isAvailable || isBusy) && styles.disabledButton]}
            disabled={!isAvailable || isBusy}
            onPress={() => handlePdfAction("share")}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                (!isAvailable || isBusy) && styles.disabledButtonText,
              ]}
            >
              {getActionLabel("share", "Share PDF")}
            </Text>
          </TouchableOpacity>

          {isInvoice && shouldShowPaymentInstructions(booking) ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={openPaymentInstructions}>
              <Text style={styles.secondaryButtonText}>View Payment Instructions</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
