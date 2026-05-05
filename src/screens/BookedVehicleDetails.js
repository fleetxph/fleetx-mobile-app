import { Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/bookedVehicleDetailsStyle";
import { getBookingStatusMeta } from "../utils/bookingStatusDisplay";
import {
  formatBookingDate,
  formatBookingPrice,
  getReferenceNo,
  getVehicleImageUrl,
  getVehicleName,
} from "../utils/bookingDocuments";

function getVehicle(booking) {
  return booking?.vehicleId || booking?.vehicle || {};
}

function valueOrDash(value) {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
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

function shouldShowPaymentInstructions(booking) {
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.paymentStatus || "").toLowerCase();

  return (
    ["awaiting_payment", "pending_payment", "payment_rejected", "invoice_issued"].includes(status) ||
    ["invoice_issued", "submitted", "under_review", "reupload_required", "rejected"].includes(paymentStatus)
  );
}

export default function BookedVehicleDetails({ navigation, route }) {
  const booking = route?.params?.booking || {};
  const [imageFailed, setImageFailed] = useState(false);
  const vehicle = getVehicle(booking);
  const meta = getBookingStatusMeta(booking?.status);
  const bookingRef = getReferenceNo(booking);
  const isInactive = meta.key === "cancelled";
  const isPaymentDue = meta.key === "awaiting_payment";
  const statusTitle = isInactive
    ? "Booking no longer active"
    : isPaymentDue
    ? "Awaiting Payment"
    : meta.key === "confirmed" || meta.key === "completed"
    ? "Booked"
    : meta.label;
  const statusMessage = isInactive
    ? "This booking is no longer active."
    : isPaymentDue
    ? "This vehicle is held for your booking while payment is pending."
    : "This vehicle is reserved for your booking.";
  const imageUrl = getVehicleImageUrl(booking);

  const openDocument = (type) => {
    navigation.navigate(type === "invoice" ? "BookingInvoice" : "BookingReceipt", {
      booking,
    });
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

        <TouchableOpacity style={styles.primaryButton} onPress={() => openDocument("receipt")}>
          <Text style={styles.primaryButtonText}>View Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => openDocument("invoice")}>
          <Text style={styles.secondaryButtonText}>View Invoice</Text>
        </TouchableOpacity>
        {shouldShowPaymentInstructions(booking) ? (
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
