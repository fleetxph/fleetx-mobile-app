import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isUnauthorizedError } from "../api/api";
import {
  createBooking,
  getClientProfile,
  getPublicPaymentMethods,
  getVehicles,
  getVehicleById,
  getVerificationStatus,
  submitClientBookingDraft,
} from "../api/clientApi";
import {
  geocodeAddress,
  getPlaceDetails,
  hasGooglePlacesApiKey,
  reverseGeocode,
  searchPlaces,
} from "../api/publicApi";
import LocationPickerModal from "../components/LocationPickerModal";
import SuccessInfoModal from "../components/SuccessInfoModal";
import { styles } from "../styles/bookingWizardStyle";
import { getDateRangeError, parseDateOnly } from "../utils/dateValidation";
import { getVehicleImageUrl } from "../utils/imageUrl";
import {
  buildLocalDateTime,
  calculateRentalPricing,
  formatRentalHours,
} from "../utils/rentalPricing";

const TRIP_TYPES = [
  {
    id: "self-drive",
    title: "Self-Drive",
    label: "Driver's License required",
    description: "You drive the vehicle with full flexibility.",
    icon: "steering",
  },
  {
    id: "with-driver",
    title: "With Driver",
    label: "Any Valid ID required",
    description: "A professional driver will be assigned.",
    icon: "account-tie",
  },
];

const SUGGESTED_DESTINATIONS = [
  "Batangas Beach",
  "Tagaytay",
  "Baguio City",
  "Palawan",
  "Boracay",
  "Cebu",
  "Davao",
  "Ilocos Norte",
];

const PURPOSE_OPTIONS = [
  "Leisure / Vacation",
  "Business Trip",
  "Family Outing",
  "Special Event",
  "Airport Transfer",
  "Other",
];

const TRANSMISSION_OPTIONS = [
  { id: "any", label: "Any" },
  { id: "automatic", label: "Automatic" },
  { id: "manual", label: "Manual" },
];

const PAYMENT_OPTIONS = [
  {
    value: "down_payment_50",
    label: "50% Down Payment",
    description: "Pay half after approval and settle the balance later.",
  },
  {
    value: "full_payment",
    label: "Full Payment",
    description: "Pay the full approved invoice amount in one payment.",
  },
];

const PENDING_GUEST_BOOKING_KEY = "pendingGuestBooking";
const MIN_LOCATION_QUERY_LENGTH = 3;
const KEYBOARD_FOCUS_DELAY = 300;
const KEYBOARD_RESYNC_DELAY = 60;
const TOP_RESERVED_SPACE = 80;
const BOTTOM_RESERVED_SPACE = 24;
const SMALL_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const BOOKING_BOTTOM_PADDING = 220;
const BOOKING_BOTTOM_PADDING_WITH_KEYBOARD = 320;

function formatPeso(value) {
  return `PHP ${Number(value || 0).toLocaleString()}`;
}

function getVehicleSeatCapacity(vehicle) {
  const rawSeats = Number(
    vehicle?.seater ?? vehicle?.seats ?? vehicle?.seatCapacity ?? vehicle?.capacity ?? 0
  );

  return rawSeats > 0 ? rawSeats : 12;
}

function getVehicleDailyRate(vehicle) {
  const rawRate = Number(
    vehicle?.rate24Hr ??
      vehicle?.dailyRate ??
      vehicle?.price ??
      vehicle?.rate ??
      vehicle?.rentalPrice ??
      NaN
  );

  return Number.isFinite(rawRate) && rawRate > 0 ? rawRate : null;
}

function clampPassengerCount(value, max) {
  const safeMax = Math.max(1, Number(max) || 1);
  const safeValue = Number(value) || 1;

  return Math.min(safeMax, Math.max(1, safeValue));
}

function toDateInput(date) {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "Not set";
  const [hours = "0", minutes = "0"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatTimeValue(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function getVehicleName(vehicle) {
  return `${vehicle?.make || ""} ${vehicle?.model || ""}`.trim() || "Vehicle";
}

function getTripTypeLabel(type) {
  return type === "self-drive" ? "Self-Drive" : "With Driver";
}

function getPaymentOptionLabel(value) {
  return value === "full_payment"
    ? "Full Payment"
    : value === "down_payment_50"
    ? "50% Down Payment"
    : "Not selected";
}

function normalizePinnedLabel(value) {
  return String(value || "").trim().toLowerCase();
}

function isGenericLocationLabel(value) {
  const normalized = normalizePinnedLabel(value);
  return (
    !normalized ||
    normalized === "pinned destination" ||
    normalized === "pinned pickup location" ||
    normalized === "pinned location" ||
    normalized === "selected map location" ||
    normalized === "pinned location selected"
  );
}

function getResolvedLocationLabel(location, fallbackText = "") {
  const candidates = [
    location?.formattedAddress,
    location?.description,
    location?.address,
    location?.label,
    location?.name,
    fallbackText,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value && !isGenericLocationLabel(value)) {
      return value;
    }
  }

  return String(fallbackText || location?.address || location?.label || "").trim();
}

function normalizeCoordinatePayload(coord) {
  if (!coord || typeof coord !== "object") return null;

  const latitude = Number(coord.latitude ?? coord.lat);
  const longitude = Number(coord.longitude ?? coord.lng ?? coord.lon ?? coord.long);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const normalized = {
    lat: latitude,
    lng: longitude,
    latitude,
    longitude,
  };
  const address = String(coord.address || coord.label || "").trim();
  const placeId = String(coord.placeId || "").trim();

  if (address) normalized.address = address;
  if (placeId) normalized.placeId = placeId;
  return normalized;
}

function buildLocationPin(coord, fallbackLabel = "") {
  const normalized = normalizeCoordinatePayload(coord);
  if (!normalized) return null;

  const resolvedLabel = getResolvedLocationLabel(normalized, fallbackLabel);

  return {
    label: resolvedLabel || fallbackLabel || "Selected map location",
    address: resolvedLabel || fallbackLabel || "Selected map location",
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    placeId: normalized.placeId || "",
    source: "api",
  };
}

function normalizeLocationSelection(selection = {}) {
  const latitude = Number(
    selection.latitude ?? selection.lat ?? selection.coords?.latitude ?? selection.coords?.lat
  );
  const longitude = Number(
    selection.longitude ?? selection.lng ?? selection.coords?.longitude ?? selection.coords?.lng
  );
  const address = String(
    selection.formattedAddress || selection.description || selection.address || selection.name || ""
  ).trim();
  const placeId = String(selection.placeId || selection.place_id || "").trim();

  return {
    address,
    label: address,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    placeId: placeId || null,
    source: selection.source || "suggestion",
  };
}

function normalizePlaceSuggestion(item = {}) {
  const address = getResolvedLocationLabel(item, item?.secondaryText || "");
  const latitude = Number(
    item.latitude ??
      item.lat ??
      item.coords?.latitude ??
      item.coords?.lat ??
      item.raw?.geometry?.location?.lat
  );
  const longitude = Number(
    item.longitude ??
      item.lng ??
      item.coords?.longitude ??
      item.coords?.lng ??
      item.raw?.geometry?.location?.lng
  );

  return {
    id: String(item.id || item.placeId || item.place_id || address).trim(),
    label: String(item.label || item.formattedAddress || address || "").trim(),
    placeId: String(item.placeId || item.place_id || "").trim(),
    description: String(item.description || item.formattedAddress || address || "").trim(),
    name: String(item.name || "").trim(),
    secondaryText: String(item.secondaryText || "").trim(),
    formattedAddress: String(item.formattedAddress || address || "").trim(),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    raw: item.raw || item,
  };
}

function getSuggestionLabel(item = {}) {
  const normalized = normalizePlaceSuggestion(item);
  return (
    normalized.label ||
    normalized.formattedAddress ||
    normalized.description ||
    normalized.name ||
    ""
  );
}

function getSuggestionCoordinates(item = {}) {
  const normalized = normalizePlaceSuggestion(item);
  if (
    !Number.isFinite(Number(normalized.latitude)) ||
    !Number.isFinite(Number(normalized.longitude))
  ) {
    return null;
  }

  return {
    latitude: Number(normalized.latitude),
    longitude: Number(normalized.longitude),
  };
}

async function readStorageItem(key) {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key) || "";
  }

  return (await AsyncStorage.getItem(key)) || "";
}

async function writeStorageItem(key, value) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

function resolveInitialSchedule({
  route,
  incomingTrip,
  pickupDate,
  returnDate,
  isDirectBooking,
}) {
  const routeSchedule = route?.params?.schedule || {};

  return {
    destination: incomingTrip?.destination || routeSchedule?.destination || "",
    pickupLocation: incomingTrip?.pickupLocation || routeSchedule?.pickupLocation || "",
    startDate:
      routeSchedule?.startDate ||
      route?.params?.startDate ||
      incomingTrip?.startDate ||
      toDateInput(pickupDate),
    startTime:
      routeSchedule?.startTime ||
      routeSchedule?.pickupTime ||
      route?.params?.startTime ||
      route?.params?.pickupTime ||
      incomingTrip?.startTime ||
      incomingTrip?.pickupTime ||
      (isDirectBooking ? "00:00" : "09:00"),
    endDate:
      routeSchedule?.endDate ||
      route?.params?.endDate ||
      incomingTrip?.endDate ||
      toDateInput(returnDate),
    endTime:
      routeSchedule?.endTime ||
      routeSchedule?.returnTime ||
      route?.params?.endTime ||
      route?.params?.returnTime ||
      incomingTrip?.endTime ||
      incomingTrip?.returnTime ||
      (isDirectBooking ? "00:00" : "18:00"),
  };
}

function normalizeVerificationLabel(data, user) {
  const raw = String(
    data?.statusLabel ||
      data?.overallStatus ||
      data?.verificationStatus ||
      user?.statusLabel ||
      user?.verificationStatus ||
      ""
  ).toLowerCase();
  const level = String(data?.verificationLevel || user?.verificationLevel || "").toLowerCase();

  if (raw.includes("pending")) return "Pending Review";
  if (raw.includes("approved") && level === "full") return "Fully Verified";
  if (raw.includes("approved")) return "Basic Verified";
  if (user?.isVerified && level === "full") return "Fully Verified";
  if (user?.isVerified) return "Basic Verified";
  return "Not Verified";
}

export default function BookingWizardScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const fieldLayouts = useRef({});
  const focusedFieldRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const locationSearchRequestRef = useRef({ destination: 0, pickupLocation: 0 });
  const { width } = useWindowDimensions();
  const isCompactScreen = width < 375;
  const incomingDraft = route?.params?.bookingDraft || null;
  const incomingVehicle =
    route?.params?.selectedVehicle ||
    route?.params?.vehicle ||
    incomingDraft?.vehicleId ||
    null;
  const incomingVehicleId =
    route?.params?.vehicleId ||
    route?.params?.selectedVehicle?._id ||
    route?.params?.vehicle?._id ||
    null;
  const incomingTrip = route?.params?.tripData || route?.params?.planData || incomingDraft || {};
  const pickupDate = route?.params?.pickupDate;
  const returnDate = route?.params?.returnDate;
  const pricingPreview = route?.params?.pricingPreview || route?.params?.bookingPreview || null;
  const entryMode = route?.params?.entryMode || route?.params?.mode || "";
  const isDirectBooking =
    entryMode === "directVehicle" ||
    entryMode === "direct" ||
    route?.params?.mode === "direct" ||
    Boolean(route?.params?.selectedVehicle) ||
    Boolean(route?.params?.vehicleId) ||
    Boolean(incomingDraft);
  const totalSteps = 4;
  const initialSchedule = useMemo(
    () =>
      resolveInitialSchedule({
        route,
        incomingTrip,
        pickupDate,
        returnDate,
        isDirectBooking,
      }),
    [incomingTrip, isDirectBooking, pickupDate, returnDate, route]
  );

  const [currentStep, setCurrentStep] = useState(
    incomingDraft?.currentStep === "payment" || incomingDraft?.currentStep === "review" ? 4 : 1
  );
  const [tripType, setTripType] = useState(
    incomingTrip?.tripType || (incomingTrip?.withDriver ? "with-driver" : "self-drive")
  );
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState(incomingVehicle ? [incomingVehicle] : []);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(incomingVehicle);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [activeGate, setActiveGate] = useState(null);
  const [success, setSuccess] = useState(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [verificationLabel, setVerificationLabel] = useState("Not Verified");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [failedImages, setFailedImages] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [paymentMethodsError, setPaymentMethodsError] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(
    incomingTrip?.selectedPaymentMethodId || route?.params?.selectedPaymentMethodId || ""
  );
  const [paymentMethod, setPaymentMethod] = useState(
    incomingTrip?.selectedPaymentMethodName ||
      incomingTrip?.paymentMethod ||
      route?.params?.paymentMethod ||
      ""
  );
  const [paymentOption, setPaymentOption] = useState(
    incomingTrip?.paymentOption || route?.params?.paymentOption || ""
  );
  const [hasEditedSchedule, setHasEditedSchedule] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeLocationField, setActiveLocationField] = useState("");
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [isLoadingDestinationSuggestions, setIsLoadingDestinationSuggestions] = useState(false);
  const [isLoadingPickupSuggestions, setIsLoadingPickupSuggestions] = useState(false);
  const [locationSuggestionsError, setLocationSuggestionsError] = useState({
    destination: "",
    pickupLocation: "",
  });
  const [completedLocationQueries, setCompletedLocationQueries] = useState({
    destination: "",
    pickupLocation: "",
  });
  const [locationPins, setLocationPins] = useState({
    pickup: buildLocationPin(
      incomingTrip?.pickupCoords || incomingTrip?.pickupCoordinates || route?.params?.pickupCoords,
      initialSchedule.pickupLocation
    ),
    destination: buildLocationPin(
      incomingTrip?.destinationCoords ||
        incomingTrip?.destinationCoordinates ||
        route?.params?.destinationCoords,
      initialSchedule.destination
    ),
  });
  const [locationPicker, setLocationPicker] = useState({
    visible: false,
    mode: "destination",
    location: null,
    statusMessage: "",
    errorMessage: "",
    isResolving: false,
  });

  const [picker, setPicker] = useState(null);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [preferences, setPreferences] = useState({
    passengers: Number(incomingTrip?.passengers || incomingTrip?.pax || incomingTrip?.numberOfPax || 2),
    budget: Number(incomingTrip?.budget || 5000),
    luggageBags: Number(incomingTrip?.luggageBags || 1),
    transmission: incomingTrip?.transmission || "any",
    tripPurpose: incomingTrip?.tripPurpose || incomingTrip?.purpose || incomingTrip?.purposeOfTravel || "",
    customPurpose: "",
  });

  const purposeOfTravel =
    preferences.tripPurpose === "Other"
      ? preferences.customPurpose.trim()
      : preferences.tripPurpose;
  const passengerMax = isDirectBooking ? getVehicleSeatCapacity(selectedVehicle) : 12;
  const selectedVehicleRate = getVehicleDailyRate(selectedVehicle);
  const effectiveBudget = isDirectBooking ? selectedVehicleRate ?? preferences.budget : preferences.budget;
  const isSelfDrive = tripType === "self-drive";
  const rentalPricing = useMemo(
    () =>
      calculateRentalPricing({
        vehicle: selectedVehicle || incomingVehicle || {},
        pickupDateTime: buildLocalDateTime(schedule.startDate, schedule.startTime || "00:00"),
        returnDateTime: buildLocalDateTime(schedule.endDate, schedule.endTime || "00:00"),
        rentalType: tripType,
        tripType,
        withDriver: tripType === "with-driver",
        paymentOption,
      }),
    [
      incomingVehicle,
      schedule.endDate,
      schedule.endTime,
      schedule.startDate,
      schedule.startTime,
      selectedVehicle,
      paymentOption,
      tripType,
    ]
  );
  const totalPrice = Number(rentalPricing.subtotal || pricingPreview?.estimatedTotal || 0);
  const defaultDeposit = Number(totalPrice > 0 ? totalPrice * 0.5 : pricingPreview?.downPayment || 0);
  const invoiceAmountDue = Number(
    paymentOption
      ? rentalPricing.amountDue || 0
      : totalPrice > 0
      ? defaultDeposit
      : pricingPreview?.downPayment || 0
  );
  const remainingBalance = Number(
    paymentOption
      ? rentalPricing.remainingBalance || 0
      : Math.max(0, Number(totalPrice > 0 ? totalPrice - defaultDeposit : pricingPreview?.remainingBalance || 0))
  );
  const downPayment = invoiceAmountDue;
  const scrollBottomPadding =
    Math.max(
      keyboardHeight ? keyboardHeight + 160 : BOOKING_BOTTOM_PADDING,
      keyboardHeight ? BOOKING_BOTTOM_PADDING_WITH_KEYBOARD : BOOKING_BOTTOM_PADDING
    ) + insets.bottom;

  const handleFieldLayout = (key, event) => {
    const { y = 0, height = 0 } = event?.nativeEvent?.layout || {};
    fieldLayouts.current[key] = { y, height };
  };

  const scrollFieldToCenter = (fieldKey, overrideKeyboardHeight) => {
    const layout = fieldLayouts.current[fieldKey];

    if (!layout || !scrollRef.current) return;

    const screenHeight = Dimensions.get("window").height;
    const effectiveKeyboardHeight = overrideKeyboardHeight || keyboardHeight || 300;
    const visibleHeight =
      screenHeight -
      effectiveKeyboardHeight -
      TOP_RESERVED_SPACE -
      BOTTOM_RESERVED_SPACE;
    const targetY = layout.y - Math.max((visibleHeight - layout.height) / 2, 0);

    scrollRef.current.scrollTo({
      y: Math.max(targetY, 0),
      animated: true,
    });
  };

  const scheduleCenteredScroll = (
    fieldKey,
    delay = KEYBOARD_FOCUS_DELAY,
    overrideKeyboardHeight
  ) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      scrollFieldToCenter(fieldKey, overrideKeyboardHeight);
      scrollTimeoutRef.current = null;
    }, delay);
  };

  const handleInputFocus = (fieldKey) => {
    focusedFieldRef.current = fieldKey;
    scheduleCenteredScroll(
      fieldKey,
      keyboardHeight ? KEYBOARD_RESYNC_DELAY : KEYBOARD_FOCUS_DELAY
    );
  };

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const nextKeyboardHeight = event?.endCoordinates?.height || 0;
      setKeyboardHeight(nextKeyboardHeight);

      if (focusedFieldRef.current) {
        scheduleCenteredScroll(
          focusedFieldRef.current,
          KEYBOARD_RESYNC_DELAY,
          nextKeyboardHeight
        );
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      focusedFieldRef.current = null;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isDirectBooking) return;

    const loadVehicles = async () => {
      try {
        setVehiclesLoading(true);
        const res = await getVehicles({
          startDate: schedule.startDate,
          endDate: schedule.endDate,
        });
        const list = res?.vehicles || [];
        setVehicles(incomingVehicle ? [incomingVehicle, ...list.filter((v) => v._id !== incomingVehicle._id)] : list);
      } catch (err) {
        console.log("Load vehicles error:", err?.response?.data || err.message);
      } finally {
        setVehiclesLoading(false);
      }
    };

    loadVehicles();
  }, [incomingVehicle, isDirectBooking, schedule.endDate, schedule.startDate]);

  useEffect(() => {
    if (!isDirectBooking || selectedVehicle || !incomingVehicleId) return;

    const loadDirectVehicle = async () => {
      try {
        setVehiclesLoading(true);
        const res = await getVehicleById(incomingVehicleId);
        const vehicle = res?.vehicle || null;

        if (vehicle) {
          setSelectedVehicle(vehicle);
          setVehicles([vehicle]);
        }
      } catch (err) {
        console.log("Load direct vehicle error:", err?.response?.data || err.message);
      } finally {
        setVehiclesLoading(false);
      }
    };

    loadDirectVehicle();
  }, [incomingVehicleId, isDirectBooking, selectedVehicle]);

  useEffect(() => {
    const loadVerification = async () => {
      try {
        const rawUser = await AsyncStorage.getItem("clientUser");
        const user = rawUser ? JSON.parse(rawUser) : null;
        const token = await AsyncStorage.getItem("clientToken");
        if (!token) {
          setVerificationLabel(normalizeVerificationLabel(null, user));
          return;
        }
        const data = await getVerificationStatus();
        setVerificationLabel(normalizeVerificationLabel(data, user));
      } catch {
        setVerificationLabel("Not Verified");
      }
    };

    loadVerification();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPaymentMethods = async () => {
      try {
        setPaymentMethodsLoading(true);
        setPaymentMethodsError("");
        const res = await getPublicPaymentMethods();
        if (!isMounted) return;
        setPaymentMethods(Array.isArray(res?.paymentMethods) ? res.paymentMethods : []);
      } catch (err) {
        if (!isMounted) return;
        setPaymentMethods([]);
        setPaymentMethodsError(
          err?.response?.data?.message || "Unable to load payment methods."
        );
      } finally {
        if (isMounted) {
          setPaymentMethodsLoading(false);
        }
      }
    };

    loadPaymentMethods();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!paymentMethods.length) return;

    if (selectedPaymentMethodId) {
      const matchedMethod = paymentMethods.find((method) => method?._id === selectedPaymentMethodId);
      if (matchedMethod && paymentMethod !== matchedMethod.name) {
        setPaymentMethod(matchedMethod.name);
      }
      return;
    }

    if (paymentMethod) {
      const matchedMethod = paymentMethods.find(
        (method) => String(method?.name || "").trim().toLowerCase() === String(paymentMethod).trim().toLowerCase()
      );
      if (matchedMethod) {
        setSelectedPaymentMethodId(matchedMethod._id);
        if (paymentMethod !== matchedMethod.name) {
          setPaymentMethod(matchedMethod.name);
        }
        return;
      }
    }

    const fallbackMethod = paymentMethods[0];
    if (fallbackMethod?._id) {
      setSelectedPaymentMethodId(fallbackMethod._id);
      setPaymentMethod(fallbackMethod.name || "");
    }
  }, [paymentMethod, paymentMethods, selectedPaymentMethodId]);

  useEffect(() => {
    if (hasEditedSchedule) return;
    setSchedule((prev) => {
      if (
        prev.destination === initialSchedule.destination &&
        prev.pickupLocation === initialSchedule.pickupLocation &&
        prev.startDate === initialSchedule.startDate &&
        prev.startTime === initialSchedule.startTime &&
        prev.endDate === initialSchedule.endDate &&
        prev.endTime === initialSchedule.endTime
      ) {
        return prev;
      }

      return initialSchedule;
    });
  }, [hasEditedSchedule, initialSchedule]);

  useEffect(() => {
    if (!isDirectBooking) return;

    setPreferences((prev) => {
      const nextPassengers = clampPassengerCount(prev.passengers, passengerMax);
      const nextBudget = selectedVehicleRate ?? prev.budget;

      if (nextPassengers === prev.passengers && nextBudget === prev.budget) {
        return prev;
      }

      return {
        ...prev,
        passengers: nextPassengers,
        budget: nextBudget,
      };
    });
  }, [isDirectBooking, passengerMax, selectedVehicleRate]);

  const recommendedVehicles = useMemo(() => {
    const list = vehicles.filter((vehicle) => {
      const seats = Number(vehicle.seater || vehicle.seats || 0);
      const rate = Number(getVehicleDailyRate(vehicle) || 0);
      const transmission = String(vehicle.transmission || "").toLowerCase();
      const status = String(vehicle.status || vehicle.availability || "").toLowerCase();

      if (vehicle.isActive === false) return false;
      if (status && ["unavailable", "maintenance", "booked"].includes(status)) return false;
      if (seats && seats < preferences.passengers) return false;
      if (preferences.budget && rate && rate > preferences.budget) return false;
      if (
        preferences.transmission !== "any" &&
        transmission &&
        transmission !== preferences.transmission
      ) {
        return false;
      }
      return true;
    });

    return list.sort((a, b) => Number(getVehicleDailyRate(a) || 0) - Number(getVehicleDailyRate(b) || 0));
  }, [vehicles, preferences]);

  useEffect(() => {
    const currentField =
      activeLocationField === "destination" || activeLocationField === "pickupLocation"
        ? activeLocationField
        : "";

    if (!currentField || !hasGooglePlacesApiKey()) {
      if (currentField === "destination") {
        setIsLoadingDestinationSuggestions(false);
      }
      if (currentField === "pickupLocation") {
        setIsLoadingPickupSuggestions(false);
      }
      return undefined;
    }

    const query = String(
      currentField === "destination" ? schedule.destination : schedule.pickupLocation
    ).trim();

    if (query.length < MIN_LOCATION_QUERY_LENGTH) {
      if (currentField === "destination") {
        setDestinationSuggestions([]);
        setIsLoadingDestinationSuggestions(false);
      } else {
        setPickupSuggestions([]);
        setIsLoadingPickupSuggestions(false);
      }
      setCompletedLocationQueries((prev) => ({ ...prev, [currentField]: "" }));
      setLocationSuggestionsError((prev) => ({ ...prev, [currentField]: "" }));
      return undefined;
    }

    const requestId = (locationSearchRequestRef.current[currentField] || 0) + 1;
    locationSearchRequestRef.current[currentField] = requestId;
    const setLoading =
      currentField === "destination"
        ? setIsLoadingDestinationSuggestions
        : setIsLoadingPickupSuggestions;
    const setSuggestions =
      currentField === "destination" ? setDestinationSuggestions : setPickupSuggestions;

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await searchPlaces(query);
        if (locationSearchRequestRef.current[currentField] !== requestId) return;
        setSuggestions(
          Array.isArray(response?.suggestions)
            ? response.suggestions.map(normalizePlaceSuggestion)
            : []
        );
        setCompletedLocationQueries((prev) => ({ ...prev, [currentField]: query }));
        setLocationSuggestionsError((prev) => ({ ...prev, [currentField]: "" }));
      } catch (error) {
        if (locationSearchRequestRef.current[currentField] !== requestId) return;
        setSuggestions([]);
        setCompletedLocationQueries((prev) => ({ ...prev, [currentField]: query }));
        setLocationSuggestionsError((prev) => ({
          ...prev,
          [currentField]:
            error?.code === "GOOGLE_MAPS_KEY_MISSING"
              ? "Location suggestions are unavailable in this build."
              : "Location suggestions are unavailable. You can still type manually.",
        }));
      } finally {
        if (locationSearchRequestRef.current[currentField] === requestId) {
          setLoading(false);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [activeLocationField, schedule.destination, schedule.pickupLocation]);

  const clearSuggestionState = (field) => {
    if (field === "destination") {
      setDestinationSuggestions([]);
      setIsLoadingDestinationSuggestions(false);
    } else {
      setPickupSuggestions([]);
      setIsLoadingPickupSuggestions(false);
    }
    setCompletedLocationQueries((prev) => ({ ...prev, [field]: "" }));
  };

  const updateSchedule = (key, value) => {
    setHasEditedSchedule(true);
    if (key === "destination" || key === "pickupLocation") {
      const pinKey = key === "destination" ? "destination" : "pickup";
      const currentPin = pinKey === "destination" ? locationPins.destination : locationPins.pickup;
      const nextValue = String(value || "").trim();
      setLocationPins((prev) => ({
        ...prev,
        [pinKey]:
          currentPin &&
          normalizePinnedLabel(currentPin?.label || currentPin?.address) !==
            normalizePinnedLabel(nextValue)
            ? null
            : currentPin,
      }));
      setCompletedLocationQueries((prev) => ({ ...prev, [key]: "" }));
      setLocationSuggestionsError((prev) => ({ ...prev, [key]: "" }));
    }
    setSchedule((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "startDate" && next.endDate) {
        const start = parseDateOnly(value);
        const end = parseDateOnly(next.endDate);
        if (start && end && end < start) {
          next.endDate = "";
        }
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: "", endDate: key === "startDate" ? "" : prev.endDate, endTime: "" }));
  };

  const handleLocationTextChange = (key, value) => {
    setActiveLocationField(key);
    updateSchedule(key, value);
  };

  const handleSelectLocationSuggestion = async (fieldKey, suggestion) => {
    try {
      const normalizedSuggestion = normalizePlaceSuggestion(suggestion);
      const details = normalizedSuggestion.placeId
        ? await getPlaceDetails(normalizedSuggestion.placeId)
        : null;
      const geocodedFallback =
        !details && getSuggestionLabel(normalizedSuggestion)
          ? await geocodeAddress(getSuggestionLabel(normalizedSuggestion))
          : null;
      const suggestionCoords = getSuggestionCoordinates(normalizedSuggestion);
      const selected = normalizeLocationSelection({
        ...(details || geocodedFallback || normalizedSuggestion || {}),
        description:
          details?.formattedAddress ||
          geocodedFallback?.formattedAddress ||
          normalizedSuggestion.formattedAddress ||
          normalizedSuggestion.description ||
          normalizedSuggestion.name,
        latitude: details?.latitude ?? geocodedFallback?.latitude ?? suggestionCoords?.latitude,
        longitude:
          details?.longitude ?? geocodedFallback?.longitude ?? suggestionCoords?.longitude,
        placeId:
          details?.placeId || geocodedFallback?.placeId || normalizedSuggestion.placeId,
        source: "suggestion",
      });
      const pinKey = fieldKey === "destination" ? "destination" : "pickup";
      const resolvedLabel = getResolvedLocationLabel(
        selected,
        getSuggestionLabel(normalizedSuggestion)
      );

      setHasEditedSchedule(true);
      setSchedule((prev) => ({
        ...prev,
        [fieldKey]: resolvedLabel || prev[fieldKey],
      }));
      setLocationPins((prev) => ({
        ...prev,
        [pinKey]: selected.latitude != null && selected.longitude != null
          ? {
              label: resolvedLabel || "Selected map location",
              address: resolvedLabel || "Selected map location",
              latitude: selected.latitude,
              longitude: selected.longitude,
              placeId: selected.placeId || "",
              source: selected.source,
            }
          : null,
      }));
      clearSuggestionState(fieldKey);
      setLocationSuggestionsError((prev) => ({ ...prev, [fieldKey]: "" }));
      setErrors((prev) => ({ ...prev, [fieldKey]: "" }));
      setActiveLocationField("");
    } catch (error) {
      setLocationSuggestionsError((prev) => ({
        ...prev,
        [fieldKey]: "We could not load this place. You can still type the address manually.",
      }));
    }
  };

  const handleLocationBlur = async (fieldKey) => {
    setTimeout(() => {
      setActiveLocationField((prev) => (prev === fieldKey ? "" : prev));
    }, 180);

    const value = String(schedule[fieldKey] || "").trim();
    if (!value) return;

    const pinKey = fieldKey === "destination" ? "destination" : "pickup";
    if (
      locationPins[pinKey] &&
      normalizePinnedLabel(locationPins[pinKey]?.label || locationPins[pinKey]?.address) ===
        normalizePinnedLabel(value)
    ) {
      return;
    }

    if (!hasGooglePlacesApiKey()) return;

    try {
      const result = await geocodeAddress(value);
      if (!result?.latitude || !result?.longitude) return;

      setLocationPins((prev) => ({
        ...prev,
        [pinKey]: {
          label: getResolvedLocationLabel(result, value) || value,
          address: getResolvedLocationLabel(result, value) || value,
          latitude: result.latitude,
          longitude: result.longitude,
          placeId: result.placeId || "",
          source: "geocoded",
        },
      }));
    } catch {
      // Manual address remains valid even if geocoding fails.
    }
  };

  const openLocationPicker = async (mode) => {
    const scheduleKey = mode === "pickup" ? "pickupLocation" : "destination";
    const existingPin = mode === "pickup" ? locationPins.pickup : locationPins.destination;
    const manualText = String(schedule[scheduleKey] || "").trim();
    const existingLabel = getResolvedLocationLabel(existingPin, manualText);
    const shouldResolveTypedText =
      Boolean(manualText) &&
      (!existingPin ||
        isGenericLocationLabel(existingPin?.label) ||
        normalizePinnedLabel(existingLabel) !== normalizePinnedLabel(manualText));

    setLocationPicker({
      visible: true,
      mode,
      location:
        existingPin && existingLabel
          ? {
              ...existingPin,
              label: existingLabel,
              address: existingLabel,
            }
          : existingPin,
      statusMessage: "",
      errorMessage: "",
      isResolving: false,
    });

    if (!shouldResolveTypedText || !hasGooglePlacesApiKey()) {
      return;
    }

    setLocationPicker((prev) => ({
      ...prev,
      visible: true,
      mode,
      isResolving: true,
      statusMessage: "Searching for this address on the map...",
      errorMessage: "",
    }));

    try {
      const resolved = await geocodeAddress(manualText);
      const selection = normalizeLocationSelection({
        ...(resolved || {}),
        description: resolved?.formattedAddress || manualText,
        source: "geocoded",
      });

      setLocationPicker((prev) => ({
        ...prev,
        location:
          selection.latitude != null && selection.longitude != null
            ? {
                label: getResolvedLocationLabel(selection, manualText) || manualText,
                address: getResolvedLocationLabel(selection, manualText) || manualText,
                latitude: selection.latitude,
                longitude: selection.longitude,
                placeId: selection.placeId || "",
                source: selection.source,
              }
            : null,
        statusMessage:
          selection.latitude != null && selection.longitude != null
            ? "Resolved the typed address to map coordinates."
            : "",
        errorMessage:
          selection.latitude != null && selection.longitude != null
            ? ""
            : "We could not locate this address on the map. You can still continue with the typed address.",
        isResolving: false,
      }));
    } catch {
      setLocationPicker((prev) => ({
        ...prev,
        isResolving: false,
        statusMessage: "",
        errorMessage:
          "We could not locate this address on the map. You can still continue with the typed address.",
      }));
    }
  };

  const closeLocationPicker = () => {
    setLocationPicker((prev) => ({
      ...prev,
      visible: false,
      location: null,
      statusMessage: "",
      errorMessage: "",
      isResolving: false,
    }));
  };

  const handleConfirmLocationPin = async (pin) => {
    const isPickup = locationPicker.mode === "pickup";
    const pinKey = isPickup ? "pickup" : "destination";
    const scheduleKey = isPickup ? "pickupLocation" : "destination";
    const fallbackLabel = String(schedule[scheduleKey] || "").trim();
    const nextLabel = getResolvedLocationLabel(pin, fallbackLabel);
    let nextAddress = nextLabel;

    if (pin?.latitude != null && pin?.longitude != null && hasGooglePlacesApiKey()) {
      try {
        const reverseResult = await reverseGeocode(pin.latitude, pin.longitude);
        if (reverseResult?.formattedAddress) {
          nextAddress = reverseResult.formattedAddress;
        }
      } catch {
        nextAddress = nextLabel || fallbackLabel || "Selected map location";
      }
    }

    const normalizedPin = buildLocationPin(
      {
        latitude: pin?.latitude,
        longitude: pin?.longitude,
        address: nextAddress,
        placeId: pin?.placeId,
      },
      nextAddress
    );

    setLocationPins((prev) => ({
      ...prev,
      [pinKey]: normalizedPin,
    }));

    setSchedule((prev) => ({
      ...prev,
      [scheduleKey]: nextAddress || fallbackLabel || prev[scheduleKey],
    }));

    clearSuggestionState(scheduleKey);
    setLocationSuggestionsError((prev) => ({ ...prev, [scheduleKey]: "" }));
    setErrors((prev) => ({ ...prev, [scheduleKey]: "" }));
    closeLocationPicker();
  };

  const openPicker = (key) => {
    setPicker(key);
  };

  const closeTransientBookingUi = () => {
    setReviewVisible(false);
    setPicker(null);
  };

  const closeGateAndNavigate = (routeName, params = {}) => {
    closeTransientBookingUi();
    setActiveGate(null);

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        navigation.navigate(routeName, params);
      }, 250);
    });
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      closeTransientBookingUi();
      setActiveGate(null);
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  const buildPendingGuestBooking = () => {
    const pickupCoords = normalizeCoordinatePayload(locationPins.pickup);
    const destinationCoords = normalizeCoordinatePayload(locationPins.destination);

    return {
      selectedVehicle,
      vehicleId: selectedVehicle?._id || selectedVehicle?.id || incomingVehicleId || route?.params?.vehicleId || "",
      entryMode,
      mode: route?.params?.mode || (isDirectBooking ? "direct" : ""),
      pickupDate: schedule.startDate ? new Date(`${schedule.startDate}T00:00:00`).toISOString() : pickupDate || "",
      returnDate: schedule.endDate ? new Date(`${schedule.endDate}T00:00:00`).toISOString() : returnDate || "",
      pricingPreview: {
        totalHours: rentalPricing.totalHours || 0,
        billingLabel: rentalPricing.billingLabel || "",
        estimatedTotal: totalPrice || 0,
        downPayment: downPayment || 0,
        remainingBalance: remainingBalance || 0,
        vehicleTotal: rentalPricing.vehicleTotal || 0,
        driverTotal: rentalPricing.driverTotal || 0,
      },
      tripData: {
        ...(incomingTrip || {}),
        destination: schedule.destination,
        pickupLocation: schedule.pickupLocation,
        ...(pickupCoords
          ? {
              pickupCoords,
              pickupCoordinates: pickupCoords,
              pickupPlaceId: locationPins.pickup?.placeId || "",
            }
          : {}),
        ...(destinationCoords
          ? {
              destinationCoords,
              destinationCoordinates: destinationCoords,
              destinationPlaceId: locationPins.destination?.placeId || "",
            }
          : {}),
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        passengers: preferences.passengers,
        numberOfPax: preferences.passengers,
        luggageBags: preferences.luggageBags,
        transmission: preferences.transmission,
        tripPurpose: preferences.tripPurpose,
        purposeOfTravel,
        withDriver: tripType === "with-driver",
        tripType,
      },
      paymentMethod,
      selectedPaymentMethodName: paymentMethod,
      paymentOption,
      selectedPaymentMethodId,
      currentStep: currentStep >= 4 ? "review" : "payment",
    };
  };

  const savePendingGuestBooking = async () => {
    await writeStorageItem(
      PENDING_GUEST_BOOKING_KEY,
      JSON.stringify(buildPendingGuestBooking())
    );
  };

  const promptGuestSignIn = async () => {
    if (activeGate || submitLoading) return;

    const shouldRestoreReview = reviewVisible;
    closeTransientBookingUi();
    setActiveGate("auth");

    try {
      await savePendingGuestBooking();
    } catch (err) {
      console.log("Save guest booking error:", err?.message || err);
    }

    let handled = false;

    setTimeout(() => {
      Alert.alert(
        "Sign in to continue",
        "You can browse vehicles and plan your trip as a guest. Please log in or create an account to confirm your booking.",
        [
          {
            text: "Log In",
            onPress: () => {
              handled = true;
              closeGateAndNavigate("ClientLogin", {
                resumeGuestBooking: true,
                redirectAfterLogin: "ResumeBooking",
                pendingBookingKey: PENDING_GUEST_BOOKING_KEY,
              });
            },
          },
          {
            text: "Create Account",
            onPress: () => {
              handled = true;
              closeGateAndNavigate("RegisterClient", {
                resumeGuestBooking: true,
                redirectAfterRegister: "ResumeBooking",
                pendingBookingKey: PENDING_GUEST_BOOKING_KEY,
              });
            },
          },
          {
            text: "Not now",
            style: "cancel",
            onPress: () => {
              handled = true;
              setActiveGate(null);
              if (shouldRestoreReview) {
                setTimeout(() => setReviewVisible(true), 250);
              }
            },
          },
        ],
        {
          cancelable: true,
          onDismiss: () => {
            if (!handled) {
              setActiveGate(null);
              if (shouldRestoreReview) {
                setTimeout(() => setReviewVisible(true), 250);
              }
            }
          },
        }
      );
    }, 250);
  };

  const updatePreference = (key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: key === "passengers" ? clampPassengerCount(value, passengerMax) : value,
    }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validateStep = () => {
    const nextErrors = {};

    if (currentStep === 1 && !tripType) {
      nextErrors.tripType = "Please select a trip type.";
    }

    if (currentStep === 2) {
      if (!schedule.destination.trim()) nextErrors.destination = "Destination is required.";
      if (!schedule.pickupLocation.trim()) nextErrors.pickupLocation = "Pickup Location is required.";
      if (!schedule.startDate) nextErrors.startDate = "Start date is required.";
      if (!schedule.startTime) nextErrors.startTime = "Start time is required.";
      if (!schedule.endDate) nextErrors.endDate = "End date is required.";
      if (!schedule.endTime) nextErrors.endTime = "End time is required.";
      const dateError = getDateRangeError(schedule);
      if (dateError) nextErrors[dateError.field] = dateError.message;
    }

    if (currentStep === 3) {
      if (!preferences.tripPurpose) nextErrors.tripPurpose = "Please select a Trip Purpose.";
      if (preferences.tripPurpose === "Other" && !preferences.customPurpose.trim()) {
        nextErrors.tripPurpose = "Please enter your Trip Purpose.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (isDirectBooking && currentStep === 3) {
      if (!selectedVehicle?._id && !selectedVehicle?.id) {
        Alert.alert(
          "Vehicle unavailable",
          "We could not load the selected vehicle. Please return to Browse and choose a vehicle again."
        );
        return;
      }
      setCurrentStep(4);
      setReviewVisible(true);
      return;
    }

    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigation.goBack?.();
      return;
    }
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handlePickerChange = (event, value) => {
    if (Platform.OS !== "ios") setPicker(null);
    if (!value || !picker) return;

    if (picker === "startDate" || picker === "endDate") {
      updateSchedule(picker, toDateInput(value));
      return;
    }
    updateSchedule(picker, formatTimeValue(value));
  };

  const buildPayload = async () => {
    const dateError = getDateRangeError(schedule);
    if (dateError) {
      const error = new Error(dateError.message);
      error.code = "INVALID_DATE_RANGE";
      error.field = dateError.field;
      throw error;
    }

    const profileResponse = await getClientProfile();
    const user = profileResponse?.user || {};
    const contact = String(user?.contact || "").trim();

    if (!/^09\d{9}$/.test(contact)) {
      const error = new Error("Please update your contact number before booking.");
      error.code = "MISSING_CONTACT";
      throw error;
    }

    const pickupCoords = normalizeCoordinatePayload(locationPins.pickup);
    const destinationCoords = normalizeCoordinatePayload(locationPins.destination);

    return {
      vehicleId: selectedVehicle?._id || selectedVehicle?.id,
      destination: schedule.destination,
      pickupLocation: schedule.pickupLocation,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      numberOfPax: preferences.passengers,
      luggageBags: preferences.luggageBags,
      purposeOfTravel,
      notes: isDirectBooking
        ? `Trip Type: ${getTripTypeLabel(tripType)}. Start Time: ${schedule.startTime}. End Time: ${schedule.endTime}. Transmission preference: ${preferences.transmission}. Billing label: ${rentalPricing.billingLabel || "Not set"}. Estimated total: ${totalPrice}.`
        : `Trip Type: ${getTripTypeLabel(tripType)}. Start Time: ${schedule.startTime}. End Time: ${schedule.endTime}. Transmission preference: ${preferences.transmission}. Budget target: ${effectiveBudget}. Billing label: ${rentalPricing.billingLabel || "Not set"}. Estimated total: ${totalPrice}.`,
      withDriver: tripType === "with-driver",
      contact,
      selectedPaymentMethodId,
      selectedPaymentMethodName: paymentMethod,
      paymentMethod,
      paymentOption,
      currentStep: "submitted",
      ...(pickupCoords
        ? {
            pickupCoords,
            pickupPlaceId: locationPins.pickup?.placeId || "",
          }
        : {}),
      ...(destinationCoords
        ? {
            destinationCoords,
            destinationPlaceId: locationPins.destination?.placeId || "",
          }
        : {}),
    };
  };

  const submitBooking = async () => {
    if (submitLoading || activeGate || successModalVisible) return;

    try {
      const token = await readStorageItem("clientToken");
      if (!token) {
        await promptGuestSignIn();
        return;
      }

      if (!paymentMethod || !selectedPaymentMethodId) {
        Alert.alert(
          "Payment option required",
          "Please select a payment option before submitting your booking."
        );
        return;
      }

      if (!paymentOption) {
        Alert.alert(
          "Payment option required",
          "Please select a payment option before submitting your booking."
        );
        return;
      }

      setSubmitLoading(true);
      const payload = await buildPayload();
      const res = incomingDraft?._id
        ? await submitClientBookingDraft(incomingDraft._id, payload)
        : await createBooking(payload);
      setReviewVisible(false);
      setSuccess(res?.booking || res);
      setSuccessModalVisible(true);
    } catch (err) {
      if (err?.code === "MISSING_CONTACT") {
        const shouldRestoreReview = reviewVisible;
        closeTransientBookingUi();
        setActiveGate("contact");

        try {
          await savePendingGuestBooking();
        } catch (saveErr) {
          console.log("Save contact gate booking error:", saveErr?.message || saveErr);
        }

        let handled = false;
        setTimeout(() => {
          Alert.alert("Contact number required", err.message, [
            {
              text: "Update Profile",
              onPress: () => {
                handled = true;
                closeGateAndNavigate("PersonalInfo", {
                  redirectAfterProfileUpdate: "ResumeBooking",
                  pendingBookingKey: PENDING_GUEST_BOOKING_KEY,
                });
              },
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                handled = true;
                setActiveGate(null);
                if (shouldRestoreReview) {
                  setTimeout(() => setReviewVisible(true), 250);
                }
              },
            },
          ], {
            cancelable: true,
            onDismiss: () => {
              if (!handled) {
                setActiveGate(null);
                if (shouldRestoreReview) {
                  setTimeout(() => setReviewVisible(true), 250);
                }
              }
            },
          });
        }, 250);
        return;
      }

      if (err?.code === "INVALID_DATE_RANGE") {
        setErrors((prev) => ({ ...prev, [err.field || "endDate"]: err.message }));
        Alert.alert("Invalid schedule", err.message);
        return;
      }

      if (isUnauthorizedError(err)) {
        const shouldRestoreReview = reviewVisible;
        closeTransientBookingUi();
        setActiveGate("session");

        try {
          await savePendingGuestBooking();
        } catch (saveErr) {
          console.log("Save session gate booking error:", saveErr?.message || saveErr);
        }

        let handled = false;
        setTimeout(() => {
          Alert.alert("Session expired", "Please sign in again to continue.", [
            {
              text: "Sign In",
              onPress: () => {
                handled = true;
                closeGateAndNavigate("ClientLogin", {
                  resumeGuestBooking: true,
                  redirectAfterLogin: "ResumeBooking",
                  pendingBookingKey: PENDING_GUEST_BOOKING_KEY,
                });
              },
            },
            {
              text: "Not now",
              style: "cancel",
              onPress: () => {
                handled = true;
                setActiveGate(null);
                if (shouldRestoreReview) {
                  setTimeout(() => setReviewVisible(true), 250);
                }
              },
            },
          ], {
            cancelable: true,
            onDismiss: () => {
              if (!handled) {
                setActiveGate(null);
                if (shouldRestoreReview) {
                  setTimeout(() => setReviewVisible(true), 250);
                }
              }
            },
          });
        }, 250);
        return;
      }

      const message = err?.response?.data?.message || err.message || "Booking failed.";
      if (err?.response?.status === 403 && err?.response?.data?.verificationStatus) {
        try {
          await savePendingGuestBooking();
        } catch (draftErr) {
          console.log("Save verification gate booking error:", draftErr?.response?.data || draftErr.message);
        }

        const shouldRestoreReview = reviewVisible;
        const canOpenBookings = Boolean(incomingDraft?._id);
        closeTransientBookingUi();
        setActiveGate("verification");

        let handled = false;
        setTimeout(() => {
          Alert.alert("Verification required", message, [
            {
              text: "Go to Verification",
              onPress: () => {
                handled = true;
                closeGateAndNavigate("Verification", {
                  verificationType: isSelfDrive ? "self_drive" : "with_driver",
                  redirectAfterVerification: "ResumeBooking",
                  pendingBookingKey: PENDING_GUEST_BOOKING_KEY,
                });
              },
            },
            {
              text: "View Bookings",
              onPress: () => {
                handled = true;
                if (canOpenBookings) {
                  closeGateAndNavigate("Bookings");
                  return;
                }

                setActiveGate(null);
                if (shouldRestoreReview) {
                  setTimeout(() => setReviewVisible(true), 250);
                }
              },
            },
            {
              text: "Not now",
              style: "cancel",
              onPress: () => {
                handled = true;
                setActiveGate(null);
                if (shouldRestoreReview) {
                  setTimeout(() => setReviewVisible(true), 250);
                }
              },
            },
          ], {
            cancelable: true,
            onDismiss: () => {
              if (!handled) {
                setActiveGate(null);
                if (shouldRestoreReview) {
                  setTimeout(() => setReviewVisible(true), 250);
                }
              }
            },
          });
        }, 250);
        return;
      }

      Alert.alert("Booking failed", message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderStepper = () => (
    <View style={styles.stepperCard}>
      <View style={styles.stepperTop}>
        <Text style={styles.stepCount}>Step {currentStep} of {totalSteps}</Text>
        <Text style={styles.stepHint}>
          {currentStep === 4
            ? isDirectBooking
              ? "Review and submit your selected vehicle"
              : "Recommended Vehicles"
            : "Complete this section to continue"}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${(currentStep / totalSteps) * 100}%` },
          ]}
        />
      </View>
    </View>
  );

  const renderTripType = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Choose how you want to travel</Text>
      <Text style={styles.cardSubtitle}>
        FleetX uses this to guide verification and match the right service.
      </Text>

      {TRIP_TYPES.map((option) => {
        const active = tripType === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.9}
            style={[styles.choiceCard, active && styles.choiceCardActive]}
            onPress={() => setTripType(option.id)}
          >
            <View style={[styles.choiceIcon, active && styles.choiceIconActive]}>
              <MaterialCommunityIcons
                name={option.icon}
                size={24}
                color={active ? "#FFFFFF" : "#F47C20"}
              />
            </View>
            <View style={styles.choiceBody}>
              <Text style={styles.choiceTitle}>{option.title}</Text>
              <Text style={styles.choiceDesc}>{option.description}</Text>
              <Text style={styles.choiceBadge}>{option.label}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.infoCard}>
        <Feather name="shield" size={18} color="#F47C20" />
        <View style={styles.infoBody}>
          <Text style={styles.infoTitle}>
            {isSelfDrive
              ? "Self-Drive requires approved Driver's License verification."
              : "With Driver requires approved Basic/Valid ID verification."}
          </Text>
          <Text style={styles.infoText}>
            Current status: {verificationLabel}. Verification is reviewed before approval.
          </Text>
        </View>
      </View>
    </View>
  );

  const handleChangeVehicle = () => {
    if (!isDirectBooking) return;

    navigation.navigate("BrowseMain", {
      tripData: {
        ...incomingTrip,
        ...schedule,
        passengers: preferences.passengers,
        budget: preferences.budget,
        transmission: preferences.transmission,
        luggageBags: preferences.luggageBags,
        tripPurpose: preferences.tripPurpose,
      },
    });
  };

  const renderDirectVehicleCard = () => {
    if (!isDirectBooking || !selectedVehicle) return null;

    return (
      <View style={styles.card}>
        <View style={styles.directVehicleHeader}>
          <View style={styles.directVehicleHeaderText}>
            <Text style={styles.cardTitle}>Selected Vehicle</Text>
            <Text style={styles.cardSubtitle}>
              You selected this vehicle from Browse.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.changeVehicleButton}
            onPress={handleChangeVehicle}
            hitSlop={SMALL_HIT_SLOP}
            activeOpacity={0.85}
          >
            <Text style={styles.changeVehicleButtonText}>Change Vehicle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.selectedVehicleCard}>
          {(() => {
            const imageUrl = getVehicleImageUrl(selectedVehicle);
            const imageKey = `selected-${selectedVehicle?._id || selectedVehicle?.id || "vehicle"}`;
            return imageUrl && !failedImages[imageKey] ? (
            <Image
              key={`${selectedVehicle?._id || selectedVehicle?.id || "vehicle"}-${imageUrl}`}
              source={{ uri: imageUrl }}
              style={styles.selectedVehicleImage}
              onError={() =>
                setFailedImages((prev) => ({
                  ...prev,
                  [imageKey]: true,
                }))
              }
            />
          ) : (
            <View style={styles.selectedVehicleImageFallback}>
              <Text style={styles.selectedVehicleImageFallbackText}>FleetX Vehicle</Text>
            </View>
            );
          })()}
          <View style={styles.selectedVehicleBody}>
            <Text style={styles.vehicleName}>{getVehicleName(selectedVehicle)}</Text>
            <Text style={styles.vehicleMeta}>
              {selectedVehicle?.category || "Vehicle"} -{" "}
              {selectedVehicle?.seater || selectedVehicle?.seats || "N/A"} seater -{" "}
              {selectedVehicle?.transmission || "N/A"}
            </Text>
            {!!selectedVehicle?.plateNo && (
              <Text style={styles.vehicleMeta}>Plate No: {selectedVehicle.plateNo}</Text>
            )}
            <Text style={styles.vehicleRate}>
              {selectedVehicleRate ? `${formatPeso(selectedVehicleRate)}/day` : "Rate unavailable"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSchedule = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Set the destination and timing</Text>
      <Text style={styles.cardSubtitle}>
        {isDirectBooking
          ? "Add the route and schedule for this vehicle so we can prepare your booking correctly."
          : "Add the route and schedule so recommendations can reflect your trip window."}
      </Text>

      <View>
        <Text style={styles.label}>Destination</Text>
        <View style={styles.inputWrap}>
          <Feather name="map-pin" size={18} color="#98A2B3" />
          <TextInput
            value={schedule.destination}
            onChangeText={(value) => handleLocationTextChange("destination", value)}
            placeholder="e.g. Tagaytay, Batangas, Baguio"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            returnKeyType="next"
            onFocus={() => setActiveLocationField("destination")}
            onBlur={() => handleLocationBlur("destination")}
          />
          <TouchableOpacity
            style={[
              styles.locationPinButton,
              locationPins.destination && styles.locationPinButtonActive,
            ]}
            activeOpacity={0.9}
            onPress={() => openLocationPicker("destination")}
            hitSlop={SMALL_HIT_SLOP}
          >
            <Ionicons
              name="location"
              size={17}
              color={locationPins.destination ? "#FFFFFF" : "#F47C20"}
            />
          </TouchableOpacity>
        </View>
        {activeLocationField === "destination" && isLoadingDestinationSuggestions ? (
          <View style={styles.suggestionStateCard}>
            <Text style={styles.suggestionStateText}>Searching locations...</Text>
          </View>
        ) : null}
        {activeLocationField === "destination" &&
        !isLoadingDestinationSuggestions &&
        destinationSuggestions.length ? (
          <View style={styles.suggestionsCard}>
            {destinationSuggestions.map((item) => (
              <TouchableOpacity
                key={`${item.id || item.placeId || item.description}-${item.secondaryText || ""}`}
                style={styles.suggestionRow}
                activeOpacity={0.85}
                onPress={() => handleSelectLocationSuggestion("destination", item)}
              >
                <Ionicons name="location-outline" size={16} color="#F47C20" />
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionTitle}>
                    {item.label || item.name || getSuggestionLabel(item)}
                  </Text>
                  {item.secondaryText ? (
                    <Text style={styles.suggestionSubtitle}>{item.secondaryText}</Text>
                  ) : item.description && item.description !== item.name ? (
                    <Text style={styles.suggestionSubtitle}>{item.description}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.suggestionFooter}>
              <Text style={styles.suggestionFooterText}>Suggestions powered by Google</Text>
            </View>
          </View>
        ) : null}
        {activeLocationField === "destination" &&
        !isLoadingDestinationSuggestions &&
        !destinationSuggestions.length &&
        schedule.destination.trim().length >= MIN_LOCATION_QUERY_LENGTH &&
        completedLocationQueries.destination === schedule.destination.trim() &&
        !locationSuggestionsError.destination ? (
          <View style={styles.suggestionStateCard}>
            <Text style={styles.suggestionStateText}>No matching locations found.</Text>
          </View>
        ) : null}
        {!!locationSuggestionsError.destination ? (
          <Text style={styles.locationHelperErrorText}>{locationSuggestionsError.destination}</Text>
        ) : null}
        {locationPins.destination ? (
          <Text
            style={[
              styles.locationStatusText,
              locationPins.destination && styles.locationStatusTextActive,
            ]}
          >
            Pinned location selected
          </Text>
        ) : null}
        <Text style={styles.locationHelperText}>
          Optional: type an address or use the pin button.
        </Text>
        {!!errors.destination && <Text style={styles.errorText}>{errors.destination}</Text>}
      </View>

      <View style={styles.chipsWrap}>
        {SUGGESTED_DESTINATIONS.map((place) => (
          <TouchableOpacity
            key={place}
            style={[styles.chip, schedule.destination === place && styles.chipActive]}
            onPress={() => updateSchedule("destination", place)}
          >
            <Text style={[styles.chipText, schedule.destination === place && styles.chipTextActive]}>
              {place}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View>
        <Text style={styles.label}>Pickup Location</Text>
        <View style={[styles.inputWrap, styles.inputWrapMultiline]}>
          <Feather name="navigation" size={18} color="#98A2B3" />
          <TextInput
            value={schedule.pickupLocation}
            onChangeText={(value) => handleLocationTextChange("pickupLocation", value)}
            placeholder="Enter full pickup address"
            placeholderTextColor="#98A2B3"
            style={[styles.input, styles.multilineInput]}
            multiline
            onFocus={() => setActiveLocationField("pickupLocation")}
            onBlur={() => handleLocationBlur("pickupLocation")}
          />
          <TouchableOpacity
            style={[styles.locationPinButton, locationPins.pickup && styles.locationPinButtonActive]}
            activeOpacity={0.9}
            onPress={() => openLocationPicker("pickup")}
            hitSlop={SMALL_HIT_SLOP}
          >
            <Ionicons
              name="location"
              size={17}
              color={locationPins.pickup ? "#FFFFFF" : "#F47C20"}
            />
          </TouchableOpacity>
        </View>
        {activeLocationField === "pickupLocation" && isLoadingPickupSuggestions ? (
          <View style={styles.suggestionStateCard}>
            <Text style={styles.suggestionStateText}>Searching locations...</Text>
          </View>
        ) : null}
        {activeLocationField === "pickupLocation" &&
        !isLoadingPickupSuggestions &&
        pickupSuggestions.length ? (
          <View style={styles.suggestionsCard}>
            {pickupSuggestions.map((item) => (
              <TouchableOpacity
                key={`${item.id || item.placeId || item.description}-${item.secondaryText || ""}`}
                style={styles.suggestionRow}
                activeOpacity={0.85}
                onPress={() => handleSelectLocationSuggestion("pickupLocation", item)}
              >
                <Ionicons name="location-outline" size={16} color="#F47C20" />
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionTitle}>
                    {item.label || item.name || getSuggestionLabel(item)}
                  </Text>
                  {item.secondaryText ? (
                    <Text style={styles.suggestionSubtitle}>{item.secondaryText}</Text>
                  ) : item.description && item.description !== item.name ? (
                    <Text style={styles.suggestionSubtitle}>{item.description}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.suggestionFooter}>
              <Text style={styles.suggestionFooterText}>Suggestions powered by Google</Text>
            </View>
          </View>
        ) : null}
        {activeLocationField === "pickupLocation" &&
        !isLoadingPickupSuggestions &&
        !pickupSuggestions.length &&
        schedule.pickupLocation.trim().length >= MIN_LOCATION_QUERY_LENGTH &&
        completedLocationQueries.pickupLocation === schedule.pickupLocation.trim() &&
        !locationSuggestionsError.pickupLocation ? (
          <View style={styles.suggestionStateCard}>
            <Text style={styles.suggestionStateText}>No matching locations found.</Text>
          </View>
        ) : null}
        {!!locationSuggestionsError.pickupLocation ? (
          <Text style={styles.locationHelperErrorText}>{locationSuggestionsError.pickupLocation}</Text>
        ) : null}
        {locationPins.pickup ? (
          <Text
            style={[
              styles.locationStatusText,
              locationPins.pickup && styles.locationStatusTextActive,
            ]}
          >
            Pinned location selected
          </Text>
        ) : null}
        <Text style={styles.locationHelperText}>
          Optional: type an address or use the pin button.
        </Text>
        {!!errors.pickupLocation && <Text style={styles.errorText}>{errors.pickupLocation}</Text>}
      </View>

      <View style={styles.twoColumn}>
        {[
          ["startDate", "Start Date", formatDate(schedule.startDate), "date"],
          ["startTime", "Start Time", formatTime(schedule.startTime), "time"],
          ["endDate", "End Date", formatDate(schedule.endDate), "date"],
          ["endTime", "End Time", formatTime(schedule.endTime), "time"],
        ].map(([key, label, value, mode]) => (
          <View
            key={key}
            style={[styles.halfField, isCompactScreen && styles.fullField]}
          >
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => openPicker(key)}
              activeOpacity={0.85}
            >
              <Text style={value === "Not set" ? styles.placeholderText : styles.pickerText}>
                {value}
              </Text>
              <Feather name={mode === "date" ? "calendar" : "clock"} size={16} color="#98A2B3" />
            </TouchableOpacity>
            {!!errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
          </View>
        ))}
      </View>

      <View style={styles.durationBox}>
        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
        <Text style={styles.durationText}>
          {rentalPricing.totalHours > 0
            ? `${formatRentalHours(rentalPricing.totalHours)} • ${rentalPricing.billingLabel}`
            : "Select valid date and time"}
        </Text>
      </View>
    </View>
  );

  const renderInlineActions = () => (
    <View style={[styles.inlineActionRow, isCompactScreen && styles.inlineActionRowStacked]}>
          <TouchableOpacity
            style={[styles.secondaryButton, isCompactScreen && styles.inlineActionButtonFull]}
            onPress={handleBack}
            activeOpacity={0.85}
          >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
      {currentStep < 4 ? (
          <TouchableOpacity
            style={[styles.primaryButton, isCompactScreen && styles.inlineActionButtonFull]}
            onPress={handleNext}
            activeOpacity={0.9}
          >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.primaryButton, isCompactScreen && styles.inlineActionButtonFull]}
          onPress={() => (isDirectBooking ? setReviewVisible(true) : setCurrentStep(3))}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>
            {isDirectBooking ? "Review Booking" : "Edit Trip Details"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPreferences = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Tune the trip to your needs</Text>
      <Text style={styles.cardSubtitle}>
        {isDirectBooking
          ? "These details help FleetX finalize your selected vehicle booking."
          : "These details help FleetX recommend a practical vehicle shortlist."}
      </Text>

      <View style={styles.controlBlock}>
        <View style={styles.controlHeader}>
          <Text style={styles.controlTitle}>Number of Passengers</Text>
          <Text style={styles.controlValue}>{preferences.passengers}</Text>
        </View>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={[
              styles.circleButton,
              preferences.passengers <= 1 && styles.buttonDisabled,
            ]}
            onPress={() => updatePreference("passengers", preferences.passengers - 1)}
            disabled={preferences.passengers <= 1}
          >
            <Text style={styles.circleButtonText}>-</Text>
          </TouchableOpacity>
          <View style={styles.counterTrack}>
            <View
              style={[
                styles.counterFill,
                { width: `${(clampPassengerCount(preferences.passengers, passengerMax) / passengerMax) * 100}%` },
              ]}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.circleButton,
              preferences.passengers >= passengerMax && styles.buttonDisabled,
            ]}
            onPress={() => updatePreference("passengers", preferences.passengers + 1)}
            disabled={preferences.passengers >= passengerMax}
          >
            <Text style={styles.circleButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        {isDirectBooking && (
          <Text
            style={{
              color: "#9A3412",
              fontSize: 12,
              lineHeight: 18,
              marginTop: 10,
              fontWeight: "700",
            }}
          >
            Maximum passengers for this vehicle: {passengerMax}
          </Text>
        )}
      </View>

      {isDirectBooking ? (
        <View style={styles.controlBlock}>
          <View style={styles.controlHeader}>
            <Text style={styles.controlTitle}>Selected Vehicle Rate</Text>
            <Text style={styles.controlValue}>
              {selectedVehicleRate ? `${formatPeso(selectedVehicleRate)} / day` : "Rate unavailable"}
            </Text>
          </View>
          <Text
            style={{
              color: "#667085",
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            This rate is based on the vehicle you already selected and cannot be edited here.
          </Text>
        </View>
      ) : (
        <View style={styles.controlBlock}>
          <View style={styles.controlHeader}>
            <Text style={styles.controlTitle}>Budget Target</Text>
            <Text style={styles.controlValue}>{formatPeso(preferences.budget)}</Text>
          </View>
          <View style={styles.counterRow}>
            <TouchableOpacity style={styles.circleButton} onPress={() => updatePreference("budget", Math.max(1000, preferences.budget - 500))}>
              <Text style={styles.circleButtonText}>-</Text>
            </TouchableOpacity>
            <View style={styles.counterTrack}>
              <View style={[styles.counterFill, { width: `${((preferences.budget - 1000) / 9000) * 100}%` }]} />
            </View>
            <TouchableOpacity style={styles.circleButton} onPress={() => updatePreference("budget", Math.min(10000, preferences.budget + 500))}>
              <Text style={styles.circleButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.label}>Luggage Bags</Text>
      <View style={styles.compactGrid}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
            <TouchableOpacity
              key={count}
              style={[styles.compactOption, preferences.luggageBags === count && styles.compactOptionActive]}
              onPress={() => updatePreference("luggageBags", count)}
              activeOpacity={0.85}
            >
            <MaterialCommunityIcons name="bag-suitcase-outline" size={17} color={preferences.luggageBags === count ? "#F47C20" : "#667085"} />
            <Text style={[styles.compactOptionText, preferences.luggageBags === count && styles.compactOptionTextActive]}>
              {count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Transmission Preference</Text>
      <View style={styles.segmentRow}>
        {TRANSMISSION_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.segment, preferences.transmission === item.id && styles.segmentActive]}
              onPress={() => updatePreference("transmission", item.id)}
              activeOpacity={0.85}
            >
            <Text style={[styles.segmentText, preferences.transmission === item.id && styles.segmentTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Trip Purpose</Text>
      <View style={styles.purposeGrid}>
        {PURPOSE_OPTIONS.map((purpose) => (
          <TouchableOpacity
            key={purpose}
            style={[styles.purposeOption, preferences.tripPurpose === purpose && styles.purposeOptionActive]}
            onPress={() => updatePreference("tripPurpose", purpose)}
            activeOpacity={0.85}
          >
            <Text style={[styles.purposeText, preferences.tripPurpose === purpose && styles.purposeTextActive]}>
              {purpose}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {preferences.tripPurpose === "Other" && (
        <View onLayout={(event) => handleFieldLayout("customPurpose", event)}>
        <View style={styles.inputWrap}>
          <Feather name="edit-3" size={18} color="#98A2B3" />
          <TextInput
            value={preferences.customPurpose}
            onChangeText={(value) => updatePreference("customPurpose", value)}
            placeholder="Describe your Trip Purpose"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            onFocus={() => handleInputFocus("customPurpose")}
          />
        </View>
        </View>
      )}
      {!!errors.tripPurpose && <Text style={styles.errorText}>{errors.tripPurpose}</Text>}
    </View>
  );

  const renderVehicleCard = (vehicle) => {
    const vehicleKey = vehicle._id || vehicle.id || getVehicleName(vehicle);
    const imageUrl = getVehicleImageUrl(vehicle);
    const failedKey = `recommend-${vehicleKey}`;

    return (
    <View key={vehicleKey} style={styles.vehicleCard}>
      {imageUrl && !failedImages[failedKey] ? (
        <Image
          key={`${vehicleKey}-${imageUrl}`}
          source={{ uri: imageUrl }}
          style={styles.vehicleImage}
          onError={() => setFailedImages((prev) => ({ ...prev, [failedKey]: true }))}
        />
      ) : (
        <View style={styles.vehicleImageFallback}>
          <Text style={styles.vehicleImageFallbackText}>FleetX Vehicle</Text>
        </View>
      )}
      <View style={styles.vehicleBody}>
        <View style={styles.vehicleTopRow}>
          <Text style={styles.vehicleName}>{getVehicleName(vehicle)}</Text>
          <Text style={styles.statusPill}>{vehicle.status || "Available"}</Text>
        </View>
        <Text style={styles.vehicleMeta}>
          {vehicle.category || "Vehicle"} - {vehicle.seater || vehicle.seats || "N/A"} seater - {vehicle.transmission || "N/A"}
        </Text>
        <Text style={styles.vehicleRate}>
          {getVehicleDailyRate(vehicle) ? `${formatPeso(getVehicleDailyRate(vehicle))}/day` : "Rate unavailable"}
        </Text>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => {
            setSelectedVehicle(vehicle);
            setReviewVisible(true);
          }}
        >
          <Text style={styles.bookButtonText}>Book This Vehicle</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  const renderSelectedVehicle = () => (
    <View style={styles.selectedVehicleCard}>
      {(() => {
        const imageUrl = getVehicleImageUrl(selectedVehicle);
        const imageKey = `review-${selectedVehicle?._id || selectedVehicle?.id || "vehicle"}`;
        return imageUrl && !failedImages[imageKey] ? (
        <Image
          key={`${selectedVehicle?._id || selectedVehicle?.id || "vehicle"}-${imageUrl}`}
          source={{ uri: imageUrl }}
          style={styles.selectedVehicleImage}
          onError={() =>
            setFailedImages((prev) => ({
              ...prev,
              [imageKey]: true,
            }))
          }
        />
      ) : (
        <View style={styles.selectedVehicleImageFallback}>
          <Text style={styles.selectedVehicleImageFallbackText}>FleetX Vehicle</Text>
        </View>
        );
      })()}
      <View style={styles.selectedVehicleBody}>
        <Text style={styles.vehicleName}>{getVehicleName(selectedVehicle)}</Text>
        <Text style={styles.vehicleMeta}>
          {selectedVehicle?.category || "Vehicle"} -{" "}
          {selectedVehicle?.seater || selectedVehicle?.seats || "N/A"} seater -{" "}
          {selectedVehicle?.transmission || "N/A"}
        </Text>
        <Text style={styles.vehicleRate}>
          {selectedVehicleRate ? `${formatPeso(selectedVehicleRate)}/day` : "Rate unavailable"}
        </Text>
      </View>
    </View>
  );

  const renderResults = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Recommended Vehicles</Text>
      <Text style={styles.cardSubtitle}>
        Filtered by trip type, passenger count, budget, transmission, and current vehicle status where available.
      </Text>

      {vehiclesLoading ? (
        <Text style={styles.emptyText}>Loading available vehicles...</Text>
      ) : recommendedVehicles.length ? (
        recommendedVehicles.map(renderVehicleCard)
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No matching vehicles found</Text>
          <Text style={styles.emptyText}>
            Go back and adjust your budget, passengers, or transmission preference.
          </Text>
        </View>
      )}
    </View>
  );

  const renderDirectReview = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Review & Submit</Text>
      <Text style={styles.cardSubtitle}>
        Your selected vehicle is locked in. Review the booking details and continue to confirmation.
      </Text>

      {selectedVehicle && renderSelectedVehicle()}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Duration</Text>
        <Text style={styles.summaryValue}>
          {rentalPricing.totalHours > 0 ? formatRentalHours(rentalPricing.totalHours) : "Not set"}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Billing</Text>
        <Text style={styles.summaryValue}>
          {rentalPricing.totalHours > 0 ? rentalPricing.billingLabel : "Not set"}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Estimated Total</Text>
        <Text style={styles.summaryValue}>{formatPeso(totalPrice)}</Text>
        <Text style={styles.summaryLabel}>Amount Due</Text>
        <Text style={styles.summaryValue}>{formatPeso(invoiceAmountDue)}</Text>
        <Text style={styles.summaryLabel}>Remaining Balance</Text>
        <Text style={styles.summaryValue}>{formatPeso(remainingBalance)}</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setReviewVisible(true)}
      >
        <Text style={styles.primaryButtonText}>Open Booking Review</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.card}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={28} color="#FFFFFF" />
      </View>
      <Text style={styles.successTitle}>Booking Request Submitted</Text>
      <Text style={styles.successSubtitle}>
        Your booking request has been sent to FleetX. Our team will review your booking details before issuing an invoice.
      </Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{success?.bookingReference || "Pending Reference"}</Text>
        <Text style={styles.summaryLabel}>{getVehicleName(success?.vehicleId || selectedVehicle)}</Text>
      </View>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("Bookings")}
      >
        <Text style={styles.primaryButtonText}>Go to Bookings</Text>
      </TouchableOpacity>
    </View>
  );

  const summaryRows = [
    ["Selected Vehicle", getVehicleName(selectedVehicle || incomingVehicle)],
    ["Trip Type", getTripTypeLabel(tripType)],
    [
      "Pickup Location",
      `${schedule.pickupLocation || "Not set"}${locationPins.pickup ? " (Pinned)" : " (Manual)"}`,
    ],
    [
      "Destination",
      `${schedule.destination || "Not set"}${locationPins.destination ? " (Pinned)" : " (Manual)"}`,
    ],
    ["Start", `${formatDate(schedule.startDate)} ${formatTime(schedule.startTime)}`],
    ["End", `${formatDate(schedule.endDate)} ${formatTime(schedule.endTime)}`],
    ["Duration", rentalPricing.totalHours > 0 ? formatRentalHours(rentalPricing.totalHours) : "Not set"],
    ["Billing", rentalPricing.totalHours > 0 ? rentalPricing.billingLabel : "Not set"],
    ["Passengers", `${preferences.passengers}`],
    ["Luggage Bags", `${preferences.luggageBags}`],
    ["Transmission", preferences.transmission === "any" ? "Any" : preferences.transmission],
    ["Trip Purpose", purposeOfTravel || "Not set"],
    ["Payment Method", paymentMethod || "Not selected"],
    ["Payment Option", paymentOption === "full_payment" ? "Full Payment" : paymentOption === "down_payment_50" ? "50% Down Payment" : "Not selected"],
    ["Estimated Total", formatPeso(totalPrice)],
    ["Required Down Payment / Deposit", formatPeso(invoiceAmountDue)],
    ["Remaining Balance", formatPeso(remainingBalance)],
    ["Verification", `${verificationLabel}. Verification is reviewed before approval.`],
  ];

  return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
        >
          <SuccessInfoModal
            visible={successModalVisible}
            title="Booking Request Submitted"
            message="Your booking request has been sent to FleetX. Our team will review your booking details before issuing an invoice."
            steps={[
              "FleetX will review your booking details.",
              "Once approved, your invoice will appear in My Bookings.",
              "You may also receive updates through notifications or email.",
              "You can track your booking status anytime in My Bookings.",
            ]}
            reference={success?.bookingReference || success?.referenceNo || "Pending Reference"}
            primaryActionLabel="View My Bookings"
            secondaryActionLabel={isDirectBooking ? "Browse Vehicles" : "Stay Here"}
            onPrimary={() => {
              setSuccessModalVisible(false);
              navigation.navigate("Bookings");
            }}
            onSecondary={() => {
              setSuccessModalVisible(false);
              if (isDirectBooking) {
                navigation.navigate("BrowseMain");
              }
            }}
            onClose={() => setSuccessModalVisible(false)}
          />
          <LocationPickerModal
            visible={locationPicker.visible}
            mode={locationPicker.mode}
            initialLocation={
              locationPicker.mode === "pickup"
                ? locationPins.pickup
                : locationPins.destination
            }
            resolvedLocation={locationPicker.location}
            initialLabel={
              locationPicker.mode === "pickup"
                ? schedule.pickupLocation
                : schedule.destination
            }
            statusMessage={locationPicker.statusMessage}
            errorMessage={locationPicker.errorMessage}
            onClose={closeLocationPicker}
            onConfirm={handleConfirmLocationPin}
          />
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            nestedScrollEnabled
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: scrollBottomPadding },
            ]}
          >
          <View style={styles.headerRow}>
            <View style={styles.headerContent}>
              <Text style={styles.headerEyebrow}>Premium booking flow</Text>
              <Text style={styles.header}>
                {isDirectBooking ? "Book Selected Vehicle" : "Plan My Trip"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              hitSlop={SMALL_HIT_SLOP}
              activeOpacity={0.85}
            >
              <Text style={styles.exitText}>Exit</Text>
            </TouchableOpacity>
          </View>

          {!success && renderStepper()}
          {!success && renderDirectVehicleCard()}
          {success
            ? renderSuccess()
            : currentStep === 1
            ? renderTripType()
            : currentStep === 2
            ? renderSchedule()
            : currentStep === 3
            ? renderPreferences()
            : isDirectBooking
            ? renderDirectReview()
            : renderResults()}
          {!success && renderInlineActions()}
          {!success && <View style={styles.bottomSpacer} />}
          </ScrollView>

        {!!picker && (
          <DateTimePicker
            value={
              picker.includes("Date") && schedule[picker]
                ? new Date(`${schedule[picker]}T00:00:00`)
                : picker.includes("Time") && schedule[picker]
                ? new Date(`2000-01-01T${schedule[picker]}:00`)
                : new Date()
            }
            mode={picker.includes("Date") ? "date" : "time"}
            minimumDate={
              picker === "endDate" && schedule.startDate
                ? new Date(`${schedule.startDate}T00:00:00`)
                : picker.includes("Date")
                ? new Date()
                : undefined
            }
            display="default"
            onChange={handlePickerChange}
          />
        )}

          <Modal visible={reviewVisible} animationType="slide" transparent onRequestClose={() => setReviewVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.reviewModal}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                contentContainerStyle={styles.reviewScrollContent}
              >
                <Text style={styles.cardTitle}>Review Booking</Text>
                <Text style={styles.cardSubtitle}>
                  Confirm the selected vehicle and complete trip details before submitting.
                </Text>

                {selectedVehicle && renderSelectedVehicle()}

                <View style={styles.reviewList}>
                  {summaryRows.map(([label, value]) => (
                    <View key={label} style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>{label}</Text>
                      <Text style={styles.reviewValue}>{value}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.paymentSection}>
                  <Text style={styles.cardTitle}>Payment Option</Text>
                  <Text style={styles.cardSubtitle}>
                    Choose how you want to pay after your booking is approved.
                  </Text>

                  <View style={styles.paymentOptionGrid}>
                    {paymentMethodsLoading ? (
                      <View style={styles.paymentOptionCard}>
                        <Text style={styles.paymentOptionText}>Loading payment methods...</Text>
                      </View>
                    ) : null}

                    {!paymentMethodsLoading && paymentMethodsError ? (
                      <View style={styles.paymentOptionCard}>
                        <Text style={styles.paymentOptionText}>{paymentMethodsError}</Text>
                      </View>
                    ) : null}

                    {!paymentMethodsLoading && !paymentMethodsError
                      ? paymentMethods.map((method) => {
                          const isSelected = selectedPaymentMethodId === method?._id;

                          return (
                            <TouchableOpacity
                              key={method?._id}
                              style={[
                                styles.paymentOptionCard,
                                isSelected && styles.paymentOptionCardSelected,
                              ]}
                              onPress={() => {
                                setSelectedPaymentMethodId(method?._id || "");
                                setPaymentMethod(method?.name || "");
                              }}
                              activeOpacity={0.85}
                            >
                              <Text
                                style={[
                                  styles.paymentOptionText,
                                  isSelected && styles.paymentOptionTextSelected,
                                ]}
                              >
                                {method?.name || "Payment Method"}
                              </Text>
                              {method?.category ? (
                                <Text style={styles.paymentHelperText}>{method.category}</Text>
                              ) : null}
                            </TouchableOpacity>
                          );
                        })
                      : null}
                  </View>

                  <Text style={styles.paymentHelperText}>
                    Selected payment method: {paymentMethod || "Not selected"}
                  </Text>

                  <View style={styles.paymentOptionGrid}>
                    {PAYMENT_OPTIONS.map((option) => {
                      const isSelected = paymentOption === option.value;

                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.paymentOptionCard,
                            isSelected && styles.paymentOptionCardSelected,
                          ]}
                          onPress={() => setPaymentOption(option.value)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.paymentOptionText,
                              isSelected && styles.paymentOptionTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text style={styles.paymentHelperText}>{option.description}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.paymentHelperText}>
                    Selected payment option: {getPaymentOptionLabel(paymentOption)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.termsBox}
                  activeOpacity={0.9}
                  onPress={() => setAcceptedTerms((value) => !value)}
                >
                  <Ionicons
                    name={acceptedTerms ? "checkbox" : "square-outline"}
                    size={22}
                    color="#F47C20"
                  />
                  <Text style={styles.termsText}>
                    I agree to FleetX booking terms, verification review, payment deadlines, and cancellation rules.
                  </Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setReviewVisible(false);
                      setCurrentStep(isDirectBooking ? 2 : 3);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.secondaryButtonText}>Edit Trip</Text>
                  </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (submitLoading || !acceptedTerms || Boolean(activeGate)) && styles.buttonDisabled,
                  ]}
                    onPress={submitBooking}
                    disabled={submitLoading || !acceptedTerms || Boolean(activeGate)}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.primaryButtonText}>
                      {submitLoading ? "Submitting..." : "Submit Booking"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setReviewVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalCloseText}>
                    {isDirectBooking ? "Back to Booking" : "Back to Vehicles"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}
