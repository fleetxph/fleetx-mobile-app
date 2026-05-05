import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getPublicPaymentMethods, submitPaymentProof } from "../api/clientApi";
import SuccessInfoModal from "../components/SuccessInfoModal";
import { styles } from "../styles/paymentInstructionsStyle";
import { formatBookingDateTime, formatBookingPrice, getReferenceNo } from "../utils/bookingDocuments";
import { getBookingStatusMeta } from "../utils/bookingStatusDisplay";
import { resolveImageUrl } from "../utils/imageUrl";

function valueOrFallback(value, fallback = "Not available") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function getBookingId(booking) {
  return booking?._id || booking?.id || "";
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
  const meta = getBookingStatusMeta(booking?.status);

  if (["submitted", "payment_submitted", "under_review", "pending"].includes(paymentStatus)) {
    return "Payment Proof Submitted";
  }

  if (["verified", "fully_paid", "downpayment_paid"].includes(paymentStatus)) {
    return "Payment Verified";
  }

  if (
    ["rejected", "reupload_required"].includes(paymentStatus) ||
    status === "payment_rejected"
  ) {
    return "Payment Update Required";
  }

  if (meta.key === "awaiting_payment") {
    return "Awaiting Payment";
  }

  return "Payment Verification";
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
  const paymentDetails =
    booking?.paymentDetails ||
    booking?.paymentInstruction ||
    booking?.paymentInstructions ||
    invoice?.paymentDetails ||
    invoice?.paymentInstruction ||
    invoice?.paymentInstructions ||
    selectedMethod?.paymentDetails ||
    selectedMethod?.paymentInstruction ||
    {};

  const methodConfig =
    selectedMethod?.config ||
    selectedMethod?.settings ||
    selectedMethod?.paymentDetails ||
    selectedMethod?.paymentInstruction ||
    {};

  return (
    valueFromSource(paymentDetails, [
      "qrUrl",
      "qrImage",
      "qrImageUrl",
      "qrCode",
      "qrCodeUrl",
      "paymentQrUrl",
      "image",
      "imageUrl",
    ]) ||
    valueFromSource(selectedMethod, [
      "qrUrl",
      "qrImage",
      "qrImageUrl",
      "qrCode",
      "qrCodeUrl",
      "paymentQrUrl",
      "image",
      "imageUrl",
      "logo",
      "logoUrl",
    ]) ||
    valueFromSource(methodConfig, [
      "qrUrl",
      "qrImage",
      "qrImageUrl",
      "qrCode",
      "qrCodeUrl",
      "paymentQrUrl",
      "image",
      "imageUrl",
      "logo",
      "logoUrl",
    ]) ||
    valueFromSource(booking, [
      "paymentQrUrl",
      "qrUrl",
      "qrImage",
      "qrImageUrl",
      "qrCode",
      "qrCodeUrl",
    ]) ||
    valueFromSource(invoice, [
      "paymentQrUrl",
      "qrUrl",
      "qrImage",
      "qrImageUrl",
      "qrCode",
      "qrCodeUrl",
    ]) ||
    ""
  );
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

export default function PaymentInstructionsScreen({ navigation, route }) {
  const [booking, setBooking] = useState(route?.params?.booking || {});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [paymentAsset, setPaymentAsset] = useState(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [qrPreviewVisible, setQrPreviewVisible] = useState(false);
  const [proofSuccessVisible, setProofSuccessVisible] = useState(false);
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
        setPaymentMethods(Array.isArray(res?.paymentMethods) ? res.paymentMethods : []);
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

  const qrSource = useMemo(
    () => getPaymentQrSource(booking, selectedPaymentMethod),
    [booking, selectedPaymentMethod]
  );
  const qrUrl = useMemo(() => resolveAssetUrl(qrSource), [qrSource]);
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

  useEffect(() => {
    console.log("Payment instructions QR debug:", {
      selectedMethodLabel:
        booking?.selectedPaymentMethodName || booking?.paymentMethod || booking?.paymentChannel || "",
      selectedMethodId: booking?.selectedPaymentMethodId || "",
      matchedMethod: selectedPaymentMethod
        ? {
            id: selectedPaymentMethod?._id || "",
            name: selectedPaymentMethod?.name || "",
            method: selectedPaymentMethod?.method || "",
            key: selectedPaymentMethod?.key || "",
            code: selectedPaymentMethod?.code || "",
            category: selectedPaymentMethod?.category || "",
          }
        : null,
      qrCandidates: {
        bookingPaymentQrUrl: booking?.paymentQrUrl || "",
        bookingQrUrl: booking?.qrUrl || "",
        bookingQrImage: booking?.qrImage || "",
        invoiceQrUrl: booking?.invoice?.qrUrl || "",
        invoiceQrImage: booking?.invoice?.qrImage || "",
        methodQrUrl: selectedPaymentMethod?.qrUrl || "",
        methodQrImage: selectedPaymentMethod?.qrImage || "",
        methodImageUrl: selectedPaymentMethod?.imageUrl || "",
        methodImage: selectedPaymentMethod?.image || "",
      },
      qrSource,
      resolvedQrUrl: qrUrl,
    });
  }, [booking, qrSource, qrUrl, selectedPaymentMethod]);

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
  };

  const openPaymentProofPicker = () => {
    Alert.alert("Upload payment proof", "Choose how you want to add the receipt image.", [
      { text: "Camera", onPress: () => pickPaymentProof("camera") },
      { text: "Gallery", onPress: () => pickPaymentProof("gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSubmitProof = async () => {
    const bookingId = getBookingId(booking);
    if (!bookingId) {
      Alert.alert("Payment Error", "Payment instructions are not available yet.");
      return;
    }

    if (!paymentAsset) {
      Alert.alert("Payment Error", "Please upload your payment proof.");
      return;
    }

    try {
      setIsSubmittingProof(true);
      const paymentProof = toBase64DataUri(paymentAsset);

      if (!paymentProof) {
        Alert.alert("Payment Error", "Please upload your payment proof.");
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
          status:
            prev?.status && String(prev.status).toLowerCase() !== "awaiting_payment"
              ? prev.status
              : "pending_approval",
        }));
      }

      setPaymentAsset(null);
      setProofSuccessVisible(true);
    } catch (error) {
      Alert.alert(
        "Payment Error",
        error?.response?.data?.message || "Unable to submit payment proof. Please try again."
      );
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const openInvoice = () => {
    navigation.navigate("BookingInvoice", { booking });
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
          {loadingMethods && !qrUrl ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#F47C20" />
              <Text style={styles.loadingText}>Loading payment QR...</Text>
            </View>
          ) : qrUrl ? (
            <TouchableOpacity style={styles.qrCard} activeOpacity={0.9} onPress={() => setQrPreviewVisible(true)}>
              <Image
                source={{ uri: qrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
                onError={(event) =>
                  console.log("QR image failed to load", qrUrl, event?.nativeEvent?.error || "")
                }
              />
              <Text style={styles.qrHint}>Tap to enlarge</Text>
            </TouchableOpacity>
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Proof of Payment</Text>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={openPaymentProofPicker}>
            <Text style={styles.secondaryButtonText}>
              {paymentAsset?.fileName || paymentAsset?.uri ? "Proof Selected" : "Upload Payment Proof"}
            </Text>
          </TouchableOpacity>

          {paymentAsset?.uri ? (
            <Text style={styles.assetName} numberOfLines={1}>
              {paymentAsset.fileName || paymentAsset.uri.split("/").pop()}
            </Text>
          ) : null}

          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={openInvoice}>
            <Text style={styles.secondaryButtonText}>View Invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmittingProof && styles.buttonDisabled]}
            activeOpacity={0.9}
            disabled={isSubmittingProof}
            onPress={handleSubmitProof}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmittingProof ? "Submitting..." : "Submit Payment Proof"}
            </Text>
          </TouchableOpacity>
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
