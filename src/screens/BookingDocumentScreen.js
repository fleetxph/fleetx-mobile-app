import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
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
import { openProtectedPdf, shareDocumentLink } from "../utils/pdfDocument";

function SummaryRow({ label, value, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "N/A"}</Text>
    </View>
  );
}

export default function BookingDocumentScreen({ navigation, route, type }) {
  const booking = route?.params?.booking || {};
  const isInvoice = type === "invoice";
  const title = isInvoice ? "Invoice" : "Receipt";
  const reference = isInvoice
    ? booking?.invoiceReference || booking?.invoiceNumber || ""
    : booking?.receiptNumber || "";
  const previewUrl = getBookingDocumentUrl(booking, type, false);
  const pdfUrl = getBookingDocumentUrl(booking, type, true) || previewUrl;
  const isAvailable = Boolean(previewUrl || pdfUrl);
  const fileName = `${title.toLowerCase()}-${reference || getBookingId(booking) || "document"}.pdf`;
  const bookingReference = getReferenceNo(booking);
  const openPdf = () =>
    openProtectedPdf({
      url: pdfUrl || previewUrl,
      bookingReference,
      documentReference: reference,
      type,
      title,
    });
  const sharePdf = () =>
    shareDocumentLink({
      url: pdfUrl || previewUrl,
      bookingReference,
      documentReference: reference,
      type,
      title,
    });

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
              : `Receipt status: ${booking?.receiptStatus || booking?.paymentStatus || "Not issued"}`}
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
                {title} is not available yet. It will appear here once FleetX issues it for this booking.
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, !isAvailable && styles.disabledButton]}
            disabled={!isAvailable}
            onPress={openPdf}
          >
            <Text style={[styles.primaryButtonText, !isAvailable && styles.disabledButtonText]}>
              Open {title} PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, !isAvailable && styles.disabledButton]}
            disabled={!isAvailable}
            onPress={openPdf}
          >
            <Text style={[styles.secondaryButtonText, !isAvailable && styles.disabledButtonText]}>
              Download PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, !isAvailable && styles.disabledButton]}
            disabled={!isAvailable}
            onPress={sharePdf}
          >
            <Text style={[styles.secondaryButtonText, !isAvailable && styles.disabledButtonText]}>
              Share PDF
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
