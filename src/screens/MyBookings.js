import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isUnauthorizedError } from "../api/api";
import {
  cancelClientBooking,
  getClientBookings,
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

export default function MyBookings({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState("active");
  const [activeFilter, setActiveFilter] = useState("all");
  const [failedImages, setFailedImages] = useState({});

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
        setBookings(res?.bookings || []);
      } catch (err) {
        if (isUnauthorizedError(err)) {
          navigation.replace("ClientLogin");
          return;
        }
        Alert.alert("Could not load bookings", err?.response?.data?.message || "Please try again.");
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
      Alert.alert("Could not continue booking", err?.response?.data?.message || "Please try again.");
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
            await cancelClientBooking(bookingId, {
              cancellationReason: "Cancelled from mobile app.",
            });
            await loadBookings("refresh");
          } catch (err) {
            Alert.alert("Cancel failed", err?.response?.data?.message || "Please try again.");
          }
        },
      },
    ]);
  };

  const goTo = (routeName) => {
    try {
      navigation?.navigate?.(routeName);
    } catch (err) {
      console.log("Navigation error:", err.message);
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

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => goTo("Home")}>
          <Ionicons name="home-outline" size={21} color="#94a3b8" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => goTo("Browse")}>
          <Ionicons name="car-outline" size={21} color="#94a3b8" />
          <Text style={styles.navText}>Browse</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.planButton} onPress={() => goTo("Plan")}>
          <MaterialCommunityIcons name="map-outline" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="briefcase" size={21} color="#f97316" />
          <Text style={[styles.navText, styles.activeNavText]}>Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => goTo("Profile")}>
          <Ionicons name="person-outline" size={21} color="#94a3b8" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
