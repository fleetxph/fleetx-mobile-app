import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getVehicleBookings } from "../api/clientApi";
import { styles } from "../styles/vehicleDetailsStyle";
import {
  formatLocalDate,
  getDateRangeError,
  isBeforeToday,
  normalizeDate,
} from "../utils/dateValidation";
import { getVehicleImageGallery } from "../utils/imageUrl";
import {
  buildLocalDateTime,
  calculateRentalPricing,
  formatRentalHours,
  getVehicleRate24Hr,
} from "../utils/rentalPricing";
import { formatLuggageSummary, getVehicleLuggageFit } from "../utils/luggageFit";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function toMidnight(value) {
  return normalizeDate(value);
}

function getDateKey(value) {
  const date = toMidnight(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value, days) {
  const date = toMidnight(value);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return date;
}

function getMonthStart(value) {
  const date = toMidnight(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthLabel(value) {
  const date = getMonthStart(value);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "Rate unavailable";
  return `\u20b1${Math.round(value).toLocaleString("en-PH")}`;
}

function formatDisplayDate(date) {
  const parsed = toMidnight(date);
  if (!parsed) return "Not set";

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isDateBooked(date, unavailableDates) {
  const key = getDateKey(date);
  if (!key) return false;

  if (unavailableDates instanceof Set) {
    return unavailableDates.has(key);
  }

  return Array.isArray(unavailableDates) ? unavailableDates.includes(key) : false;
}

function doesRangeContainBookedDate(startDate, endDate, unavailableDates) {
  const start = toMidnight(startDate);
  const end = toMidnight(endDate);

  if (!start || !end || end < start) return false;

  let cursor = new Date(start);
  while (cursor <= end) {
    if (isDateBooked(cursor, unavailableDates)) {
      return true;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return false;
}

function getCalendarMarkedDates(bookedRanges = [], pickupDate, returnDate) {
  const marked = {};

  bookedRanges.forEach((booking) => {
    const start = toMidnight(booking?.startDate);
    const end = toMidnight(booking?.endDate);
    if (!start || !end || end < start) return;

    let cursor = new Date(start);
    while (cursor <= end) {
      marked[getDateKey(cursor)] = "booked";
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  const pickupKey = getDateKey(pickupDate);
  const returnKey = getDateKey(returnDate);
  if (pickupKey) marked[pickupKey] = "pickup";
  if (returnKey) marked[returnKey] = "return";

  if (pickupDate && returnDate) {
    let cursor = addDays(pickupDate, 1);
    while (cursor && cursor < returnDate) {
      const key = getDateKey(cursor);
      if (!marked[key]) marked[key] = "range";
      cursor = addDays(cursor, 1);
    }
  }

  return marked;
}

export default function VehicleDetails({ route, navigation }) {
  const { vehicle, tripData } = route.params || {};
  const vehicleId = vehicle?._id || vehicle?.id || route.params?.vehicleId || null;
  const initialPickupDate = tripData?.startDate
    ? new Date(`${tripData.startDate}T00:00:00`)
    : null;
  const initialReturnDate = tripData?.endDate
    ? new Date(`${tripData.endDate}T00:00:00`)
    : null;

  const [pickupDate, setPickupDate] = useState(initialPickupDate);
  const [returnDate, setReturnDate] = useState(initialReturnDate);
  const [errorMsg, setErrorMsg] = useState("");
  const [availabilityNotice, setAvailabilityNotice] = useState("");
  const [failedImages, setFailedImages] = useState({});
  const [activeImage, setActiveImage] = useState(null);
  const [activeDateField, setActiveDateField] = useState(
    initialPickupDate && !initialReturnDate ? "return" : "pickup"
  );
  const [calendarMonth, setCalendarMonth] = useState(
    getMonthStart(initialPickupDate || new Date())
  );
  const [bookedRanges, setBookedRanges] = useState([]);

  const galleryImages = useMemo(() => getVehicleImageGallery(vehicle), [vehicle]);
  const today = useMemo(() => toMidnight(new Date()), []);
  const selectedVehicleRate = useMemo(() => {
    const rate = getVehicleRate24Hr(vehicle);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  }, [vehicle]);
  const rentalPricing = useMemo(
    () =>
      calculateRentalPricing({
        vehicle,
        pickupDateTime: buildLocalDateTime(
          pickupDate ? formatLocalDate(pickupDate) : "",
          tripData?.startTime || tripData?.pickupTime || "00:00"
        ),
        returnDateTime: buildLocalDateTime(
          returnDate ? formatLocalDate(returnDate) : "",
          tripData?.endTime || tripData?.returnTime || "00:00"
        ),
        rentalType: tripData?.tripType || tripData?.rentalType || "",
        withDriver: Boolean(tripData?.withDriver),
      }),
    [pickupDate, returnDate, tripData, vehicle]
  );
  const billingDays = useMemo(() => {
    if (rentalPricing.totalHours <= 0) return 0;
    return Math.max(1, Math.ceil(rentalPricing.totalHours / 24));
  }, [rentalPricing.totalHours]);
  const estimatedTotal = useMemo(() => rentalPricing.subtotal || 0, [rentalPricing.subtotal]);
  const estimatedDeposit = useMemo(() => estimatedTotal * 0.5, [estimatedTotal]);
  const remainingBalance = useMemo(
    () => Math.max(0, estimatedTotal - estimatedDeposit),
    [estimatedTotal, estimatedDeposit]
  );
  const hasValidDates = Boolean(pickupDate && returnDate && rentalPricing.totalHours > 0);
  const canContinue = hasValidDates && Boolean(selectedVehicleRate);
  const vehicleFit = useMemo(
    () => getVehicleLuggageFit(vehicle || {}, tripData || {}),
    [tripData, vehicle]
  );

  useEffect(() => {
    setActiveImage(galleryImages[0] || null);
    setFailedImages({});
  }, [vehicle?._id, vehicle?.id, galleryImages]);

  useEffect(() => {
    let isMounted = true;

    const loadBookedRanges = async () => {
      if (!vehicleId) {
        if (isMounted) {
          setBookedRanges([]);
          setAvailabilityNotice("");
        }
        return;
      }

      try {
        setAvailabilityNotice("");
        const response = await getVehicleBookings(vehicleId);
        const ranges = Array.isArray(response?.bookings) ? response.bookings : [];

        if (!isMounted) return;

        setBookedRanges(ranges);
      } catch (error) {
        if (!isMounted) return;
        console.log("Vehicle booking availability error:", error?.response?.data || error?.message || error);
        setBookedRanges([]);
        setAvailabilityNotice(
          "Booked dates could not be loaded right now. Please review your dates carefully before continuing."
        );
      }
    };

    loadBookedRanges();

    return () => {
      isMounted = false;
    };
  }, [vehicleId]);

  const calendarMarkedDates = useMemo(
    () => getCalendarMarkedDates(bookedRanges, pickupDate, returnDate),
    [bookedRanges, pickupDate, returnDate]
  );

  const unavailableDateKeys = useMemo(() => {
    const keys = new Set();

    bookedRanges.forEach((booking) => {
      const start = toMidnight(booking?.startDate);
      const end = toMidnight(booking?.endDate);

      if (!start || !end || end < start) return;

      let cursor = new Date(start);
      while (cursor <= end) {
        keys.add(getDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return keys;
  }, [bookedRanges]);

  const calendarDays = useMemo(() => {
    const monthStart = getMonthStart(calendarMonth);
    const gridStart = addDays(monthStart, -monthStart.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [calendarMonth]);

  useEffect(() => {
    if (pickupDate) {
      setCalendarMonth(getMonthStart(pickupDate));
    }
  }, [pickupDate]);

  useEffect(() => {
    if (pickupDate && isDateBooked(pickupDate, unavailableDateKeys)) {
      setPickupDate(null);
      setReturnDate(null);
      setActiveDateField("pickup");
      setErrorMsg("Your previous pickup date is no longer available.");
      return;
    }

    if (
      pickupDate &&
      returnDate &&
      doesRangeContainBookedDate(pickupDate, returnDate, unavailableDateKeys)
    ) {
      setReturnDate(null);
      setActiveDateField("return");
      setErrorMsg("Your selected range includes booked dates. Please choose another return date.");
    }
  }, [pickupDate, returnDate, unavailableDateKeys]);

  const handleDateSelection = (selectedDate) => {
    const nextDate = toMidnight(selectedDate);
    if (!nextDate) return;

    if (isBeforeToday(nextDate)) {
      Alert.alert("Unavailable date", "Past dates cannot be selected.");
      return;
    }

    if (isDateBooked(nextDate, unavailableDateKeys)) {
      Alert.alert("Unavailable date", "That date is already booked for this vehicle.");
      return;
    }

    setErrorMsg("");

    if (activeDateField === "pickup") {
      setPickupDate(nextDate);

      if (returnDate && toMidnight(returnDate) <= nextDate) {
        setReturnDate(null);
      }

      setActiveDateField("return");
      return;
    }

    if (!pickupDate) {
      Alert.alert("Pickup date required", "Please select a pickup date first.");
      setActiveDateField("pickup");
      return;
    }

    const dateError = getDateRangeError({ startDate: pickupDate, endDate: nextDate });
    if (dateError || nextDate <= toMidnight(pickupDate)) {
      setReturnDate(null);
      Alert.alert("Invalid return date", "Return date must be later than pickup date.");
      return;
    }

    if (doesRangeContainBookedDate(pickupDate, nextDate, unavailableDateKeys)) {
      setReturnDate(null);
      Alert.alert(
        "Date range unavailable",
        "Selected dates are already booked for this vehicle."
      );
      return;
    }

    setReturnDate(nextDate);
  };

  const handleContinueBooking = () => {
    setErrorMsg("");

    if (!pickupDate || !returnDate) {
      const message = "Please select pickup and return dates before continuing.";
      setErrorMsg(message);
      Alert.alert("Dates required", message);
      return;
    }

    if (rentalPricing.totalHours <= 0) {
      const message = "Return date must be later than pickup date.";
      setErrorMsg(message);
      Alert.alert("Invalid schedule", message);
      return;
    }

    if (doesRangeContainBookedDate(pickupDate, returnDate, unavailableDateKeys)) {
      const message =
        "Your selected rental period includes booked dates. Please choose a different range.";
      setErrorMsg(message);
      setReturnDate(null);
      setActiveDateField("return");
      Alert.alert("Date range unavailable", message);
      return;
    }

    if (!selectedVehicleRate) {
      const message = "Rate unavailable for this vehicle right now.";
      setErrorMsg(message);
      Alert.alert("Rate unavailable", message);
      return;
    }

    const dateError = getDateRangeError({ startDate: pickupDate, endDate: returnDate });
    if (dateError) {
      setErrorMsg(dateError.message);
      Alert.alert("Invalid schedule", dateError.message);
      return;
    }

    const bookingPreview = {
      selectedVehicleRate,
      pickupDate: pickupDate.toISOString(),
      returnDate: returnDate.toISOString(),
      totalHours: rentalPricing.totalHours,
      durationHours: rentalPricing.totalHours,
      billingLabel: rentalPricing.billingLabel,
      billingDays: Math.max(1, billingDays),
      totalRentalFee: estimatedTotal,
      estimatedTotal,
      deposit: estimatedDeposit,
      estimatedDeposit,
      downPayment: estimatedDeposit,
      remainingBalance,
      vehicleTotal: rentalPricing.vehicleTotal,
      driverTotal: rentalPricing.driverTotal || 0,
    };

    navigation.navigate("BookingWizard", {
      vehicle,
      vehicleId,
      selectedVehicle: vehicle,
      entryMode: "directVehicle",
      mode: "direct",
      pickupDate: bookingPreview.pickupDate,
      returnDate: bookingPreview.returnDate,
      pricingPreview: {
        totalHours: bookingPreview.totalHours,
        billingLabel: bookingPreview.billingLabel,
        estimatedTotal: bookingPreview.estimatedTotal,
        downPayment: bookingPreview.downPayment,
        remainingBalance: bookingPreview.remainingBalance,
        vehicleTotal: bookingPreview.vehicleTotal,
        driverTotal: bookingPreview.driverTotal,
      },
      tripData: {
        ...(tripData || {}),
        startDate: formatLocalDate(pickupDate),
        endDate: formatLocalDate(returnDate),
        luggageBags: Number(
          tripData?.luggageBags ?? tripData?.luggageCount ?? tripData?.bagCount ?? tripData?.bags ?? 0
        ),
        luggageCount: Number(
          tripData?.luggageBags ?? tripData?.luggageCount ?? tripData?.bagCount ?? tripData?.bags ?? 0
        ),
        startTime: tripData?.startTime || tripData?.pickupTime || "00:00",
        endTime: tripData?.endTime || tripData?.returnTime || "00:00",
        durationHours: bookingPreview.durationHours,
        billingDays: bookingPreview.billingDays,
        billingLabel: bookingPreview.billingLabel,
        totalRentalFee: bookingPreview.totalRentalFee,
        estimatedTotal: bookingPreview.estimatedTotal,
        deposit: bookingPreview.deposit,
        estimatedDeposit: bookingPreview.estimatedDeposit,
        downPayment: bookingPreview.downPayment,
        remainingBalance: bookingPreview.remainingBalance,
      },
      bookingPreview,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: 140 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.imageSection}>
        {activeImage && !failedImages[activeImage] ? (
          <Image
            key={`${vehicle?._id || vehicle?.id || "vehicle"}-${activeImage}`}
            source={{ uri: activeImage }}
            style={styles.mainImage}
            onError={() => setFailedImages((prev) => ({ ...prev, [activeImage]: true }))}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No Image Available</Text>
          </View>
        )}

        {galleryImages.length > 1 ? (
          <View style={styles.thumbnailRow}>
            {galleryImages.map((imageUrl) => {
              const isActive = activeImage === imageUrl;

              return (
                <TouchableOpacity
                  key={`${vehicle?._id || vehicle?.id || "vehicle"}-${imageUrl}`}
                  style={isActive ? styles.thumbnailActive : styles.thumbnail}
                  activeOpacity={0.85}
                  onPress={() => setActiveImage(imageUrl)}
                >
                  {!failedImages[imageUrl] ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.thumbnailImage}
                      onError={() => setFailedImages((prev) => ({ ...prev, [imageUrl]: true }))}
                    />
                  ) : (
                    <View style={styles.thumbnailFallback} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.vehicleTitle}>
          {vehicle?.make} {vehicle?.model}
        </Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{vehicle?.year || "N/A"}</Text>
            <Text style={styles.infoLabel}>Model</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{vehicle?.seater || "N/A"}</Text>
            <Text style={styles.infoLabel}>Seater</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{vehicle?.category || "N/A"}</Text>
            <Text style={styles.infoLabel}>Category</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{vehicle?.transmission || "N/A"}</Text>
            <Text style={styles.infoLabel}>Transmission</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{vehicle?.fuel || "N/A"}</Text>
            <Text style={styles.infoLabel}>Fuel</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{vehicle?.coding || "N/A"}</Text>
            <Text style={styles.infoLabel}>Coding</Text>
          </View>
        </View>

        <View style={styles.rateBox}>
          <Text style={styles.rateLabel}>Rental Rate</Text>
          <Text style={styles.rateValue}>
            {selectedVehicleRate ? `${formatCurrency(selectedVehicleRate)}/day` : "Rate unavailable"}
          </Text>
        </View>

        <View style={styles.fitCard}>
          <Text style={styles.fitPrimary}>{vehicleFit.recommendation}</Text>
          <Text style={styles.fitSecondary}>{vehicleFit.passengerMessage}</Text>
          <Text style={styles.fitSecondary}>{vehicleFit.luggageMessage}</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Booking Preview</Text>
        <Text style={styles.sectionSubtitle}>
          Select your rental dates first before continuing to the booking form.
        </Text>

        {!!tripData && (
          <View style={styles.prefilledNotice}>
            <Text style={styles.prefilledNoticeText}>
              Trip planner details were applied. You can still change your dates here.
            </Text>
          </View>
        )}

        {!!availabilityNotice && (
          <View style={styles.availabilityNotice}>
            <Text style={styles.availabilityNoticeText}>{availabilityNotice}</Text>
          </View>
        )}

        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <View style={styles.dateFieldRow}>
          <TouchableOpacity
            onPress={() => setActiveDateField("pickup")}
            style={[
              styles.dateFieldCard,
              activeDateField === "pickup" && styles.dateFieldCardActive,
            ]}
          >
            <Text style={styles.label}>Pickup Date</Text>
            <Text style={styles.inputText}>
              {pickupDate ? formatDisplayDate(pickupDate) : "Select pickup date"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveDateField("return")}
            style={[
              styles.dateFieldCard,
              activeDateField === "return" && styles.dateFieldCardActive,
            ]}
          >
            <Text style={styles.label}>Return Date</Text>
            <Text style={styles.inputText}>
              {returnDate ? formatDisplayDate(returnDate) : "Select return date"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.calendarNavButton}
              onPress={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              <Text style={styles.calendarNavText}>{"<"}</Text>
            </TouchableOpacity>

            <Text style={styles.calendarMonthText}>{getMonthLabel(calendarMonth)}</Text>

            <TouchableOpacity
              style={styles.calendarNavButton}
              onPress={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              <Text style={styles.calendarNavText}>{">"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.calendarHint}>
            {activeDateField === "pickup"
              ? "Select your pickup date."
              : "Select your return date. Booked dates are blocked."}
          </Text>

          <View style={styles.calendarWeekRow}>
            {DAY_LABELS.map((day) => (
              <Text key={day} style={styles.calendarWeekLabel}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day) => {
              const dayKey = getDateKey(day);
              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
              const isPast = day < today;
              const markerType = calendarMarkedDates[dayKey];
              const blocked = isDateBooked(day, unavailableDateKeys);
              const beforePickup =
                activeDateField === "return" && pickupDate && day <= toMidnight(pickupDate);
              const disabled = isPast || blocked || beforePickup;
              const isPickup = markerType === "pickup";
              const isReturn = markerType === "return";
              const isInRange = markerType === "range";

              return (
                <TouchableOpacity
                  key={dayKey}
                  activeOpacity={disabled ? 1 : 0.85}
                  onPress={() => !disabled && handleDateSelection(day)}
                  style={[
                    styles.calendarDay,
                    !isCurrentMonth && styles.calendarDayMuted,
                    blocked && styles.calendarDayBlocked,
                    isInRange && styles.calendarDayInRange,
                    (isPickup || isReturn) && styles.calendarDaySelected,
                    disabled && styles.calendarDayDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      !isCurrentMonth && styles.calendarDayTextMuted,
                      blocked && styles.calendarDayTextBlocked,
                      (isPickup || isReturn) && styles.calendarDayTextSelected,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  {blocked ? <View style={styles.calendarBlockedDot} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.calendarLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendSwatchSelected]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendSwatchRange]} />
              <Text style={styles.legendText}>Range</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendSwatchBlocked]} />
              <Text style={styles.legendText}>Unavailable</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryChipsRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Pick-up</Text>
            <Text style={styles.summaryChipValue}>
              {pickupDate ? formatDisplayDate(pickupDate) : "Select date"}
            </Text>
          </View>

          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Return</Text>
            <Text style={styles.summaryChipValue}>
              {returnDate ? formatDisplayDate(returnDate) : "Select date"}
            </Text>
          </View>

          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Duration</Text>
            <Text style={styles.summaryChipValue}>
              {hasValidDates ? formatRentalHours(rentalPricing.totalHours) : "Select dates"}
            </Text>
          </View>

          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Billing</Text>
            <Text style={styles.summaryChipValue}>
              {rentalPricing.totalHours > 0 ? rentalPricing.billingLabel : "Select dates"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pickup</Text>
            <Text style={styles.summaryValue}>
              {pickupDate ? formatDisplayDate(pickupDate) : "Not set"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Return</Text>
            <Text style={styles.summaryValue}>
              {returnDate ? formatDisplayDate(returnDate) : "Not set"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>
              {hasValidDates ? formatRentalHours(rentalPricing.totalHours) : "Select valid dates"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Billing</Text>
            <Text style={styles.summaryValue}>
              {rentalPricing.totalHours > 0 ? rentalPricing.billingLabel : "Not set"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Luggage</Text>
            <Text style={styles.summaryValue}>
              {formatLuggageSummary(tripData || {})}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Total</Text>
            <Text style={styles.summaryValue}>
              {estimatedTotal > 0 ? formatCurrency(estimatedTotal) : "Select dates"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Deposit / Down Payment</Text>
            <Text style={styles.summaryValue}>
              {estimatedDeposit > 0 ? formatCurrency(estimatedDeposit) : "Select dates"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remaining Balance</Text>
            <Text style={styles.summaryValue}>
              {remainingBalance > 0 ? formatCurrency(remainingBalance) : "Select dates"}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleContinueBooking}
        style={[styles.button, !canContinue && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>Continue Booking</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
