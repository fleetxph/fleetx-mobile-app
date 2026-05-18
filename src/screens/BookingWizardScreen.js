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
  estimateRouteMinimumDuration,
  getClientProfile,
  getPublicPaymentMethods,
  getVehicles,
  getVehicleById,
  getVerificationStatus,
  submitClientBookingDraft,
} from "../api/clientApi";
import {
  geocodeAddress,
  GOOGLE_PLACES_CONFIG_MESSAGE,
  getActiveRestrictedAreas,
  getPlaceDetails,
  hasGooglePlacesApiKey,
  reverseGeocode,
  searchPlaces,
} from "../api/publicApi";
import LocationPickerModal from "../components/LocationPickerModal";
import SuccessInfoModal from "../components/SuccessInfoModal";
import { styles } from "../styles/bookingWizardStyle";
import {
  ceilDateToThirtyMinutes,
  combineDateAndTime,
  getDateRangeError,
  normalizeTimeToThirtyMinutes,
  parseDateOnly,
} from "../utils/dateValidation";
import {
  calculateSelectedRentalDuration,
  evaluateDestinationRules,
  getDestinationCategoryLabel,
} from "../utils/destinationRules";
import { getVehicleImageUrl } from "../utils/imageUrl";
import {
  formatLuggageSummary as formatLuggageSummaryText,
  getHeavyLuggageWarning,
  getVehicleLuggageFit,
} from "../utils/luggageFit";
import {
  evaluateRestrictedArea,
  getFallbackRestrictedAreaRules,
  normalizeRestrictedAreaRules,
} from "../utils/restrictedAreas";
import {
  buildLocalDateTime,
  calculateRentalPricing,
  formatRentalHours,
} from "../utils/rentalPricing";
import {
  dedupePaymentMethods,
  formatPaymentMethodName,
  getPaymentMethodSelectionKey,
} from "../utils/paymentMethods";

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

const RETURN_ARRANGEMENT_OPTIONS = [
  {
    value: "return_to_office",
    label: "I will return the vehicle",
    description: "Return the vehicle yourself at the agreed location.",
  },
  {
    value: "request_vehicle_pickup",
    label: "Request vehicle pickup",
    description: "Ask FleetX to pick up the vehicle after your trip.",
  },
];

const PICKUP_OPTION_OPTIONS = [
  {
    value: "pickup",
    label: "I will pick up the vehicle",
    description: "Pick up the vehicle yourself at the agreed location.",
  },
  {
    value: "delivery",
    label: "Deliver the vehicle",
    description: "Ask FleetX to deliver the vehicle to your pickup location.",
  },
];

const PENDING_GUEST_BOOKING_KEY = "pendingGuestBooking";
const MIN_LOCATION_QUERY_LENGTH = 2;
const KEYBOARD_FOCUS_DELAY = 300;
const KEYBOARD_RESYNC_DELAY = 60;
const TOP_RESERVED_SPACE = 80;
const BOTTOM_RESERVED_SPACE = 24;
const SMALL_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const BOOKING_BOTTOM_PADDING = 220;
const BOOKING_BOTTOM_PADDING_WITH_KEYBOARD = 320;
const ROUTE_VALIDATION_DEBOUNCE = 550;
const DEFAULT_ROUTE_GUIDANCE_MESSAGE =
  "Complete the route and schedule so we can validate the minimum trip duration.";
const ROUTE_VALIDATION_FALLBACK_MESSAGE =
  "Route timing could not be verified right now. You can continue, but final duration may still be reviewed before invoice issuance.";

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

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

function normalizeNonNegativeCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function formatOptionalCount(value) {
  return `${normalizeNonNegativeCount(value)}`;
}

function formatOptionalWeight(value) {
  if (value === null || value === undefined || value === "") return "Not set";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed} kg` : "Not set";
}

function formatLuggageSummary({ count, size, weightKg }) {
  const normalizedCount = normalizeNonNegativeCount(count);
  const normalizedSize = String(size || "").trim();
  const normalizedWeight = String(weightKg || "").trim();

  if (!normalizedCount && !normalizedSize && !normalizedWeight) {
    return "None specified";
  }

  const parts = [];

  if (normalizedCount) {
    parts.push(`${normalizedCount} ${normalizedCount === 1 ? "bag" : "bags"}`);
  }

  if (normalizedSize) {
    parts.push(normalizedSize);
  }

  if (normalizedWeight) {
    const numericWeight = Number(normalizedWeight);
    parts.push(Number.isFinite(numericWeight) ? `${numericWeight} kg` : normalizedWeight);
  }

  return parts.length ? parts.join(" · ") : "None specified";
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
  return normalizeTripType(type) === "self-drive" ? "Self-Drive" : "With Driver";
}

function normalizeTripType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (normalized === "withdriver") return "with-driver";
  if (normalized === "selfdrive") return "self-drive";
  return "";
}

function normalizeTripTypeKey(value) {
  return normalizeTripType(value).replace(/-/g, "");
}

function isWithDriverTrip(value) {
  return normalizeTripType(value) === "with-driver";
}

function isSelfDriveTrip(value) {
  return normalizeTripType(value) === "self-drive";
}

function getPaymentOptionLabel(value) {
  return value === "full_payment"
    ? "Full Payment"
    : value === "down_payment_50"
    ? "50% Down Payment"
    : "Not selected";
}

function normalizePickupOptionValue(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    [
      "pickup",
      "self_pickup",
      "selfpickup",
      "i_will_pick_up_the_vehicle",
      "customer_pickup",
    ].includes(normalized)
  ) {
    return "pickup";
  }

  if (
    [
      "delivery",
      "vehicle_delivery",
      "vehicledelivery",
      "deliver_vehicle",
      "deliver_the_vehicle",
      "company_delivery",
    ].includes(normalized)
  ) {
    return "delivery";
  }

  return "";
}

function resolveInitialPickupOption(trip = {}, routeParams = {}) {
  const directValue = normalizePickupOptionValue(
    trip?.vehicleHandoffOption ||
      trip?.pickupOption ||
      trip?.pickupDeliveryOption ||
      trip?.deliveryOption ||
      trip?.pickupArrangement ||
      trip?.vehiclePickupOption ||
      trip?.pickupType ||
      trip?.deliveryType ||
      routeParams?.vehicleHandoffOption ||
      routeParams?.pickupOption ||
      routeParams?.pickupDeliveryOption ||
      routeParams?.deliveryOption
  );

  if (directValue) return directValue;
  if (isWithDriverTrip(trip?.tripType || routeParams?.tripType) || trip?.withDriver) return "";
  return "pickup";
}

function normalizeReturnArrangementValue(
  value,
  { vehicleHandoffOption = "", allowPickupSameLocation = true } = {}
) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "return_to_office") {
    return "return_to_office";
  }

  if (["pickup_same_location", "pickupsamelocation"].includes(normalized)) {
    return allowPickupSameLocation && vehicleHandoffOption === "delivery"
      ? "pickup_same_location"
      : "pickup_different_location";
  }

  if (["pickup_different_location", "pickupdifferentlocation"].includes(normalized)) {
    return "pickup_different_location";
  }

  if (
    ["customer_return", "self_return", "i_will_return_the_vehicle"].includes(normalized)
  ) {
    return "return_to_office";
  }

  if (
    ["pickup_by_company", "request_vehicle_pickup", "company_pickup", "pickup"].includes(
      normalized
    )
  ) {
    return vehicleHandoffOption === "delivery" && allowPickupSameLocation
      ? "pickup_same_location"
      : "pickup_different_location";
  }

  if (normalized === "driver_managed_return") {
    return "return_to_office";
  }

  return "";
}

function resolveInitialReturnArrangement(trip = {}, routeParams = {}, vehicleHandoffOption = "") {
  const directValue = normalizeReturnArrangementValue(
    trip?.returnArrangementType ||
      trip?.returnArrangement ||
      trip?.returnOption ||
      trip?.returnType ||
      routeParams?.returnArrangementType ||
      routeParams?.returnArrangement ||
      routeParams?.returnOption,
    {
      vehicleHandoffOption,
      allowPickupSameLocation: true,
    }
  );

  if (directValue) return directValue;
  if (trip?.returnToOffice === true) return "return_to_office";
  if (trip?.deliverVehicle === true) {
    return vehicleHandoffOption === "delivery"
      ? "pickup_same_location"
      : "pickup_different_location";
  }
  if (isWithDriverTrip(trip?.tripType || routeParams?.tripType) || trip?.withDriver) {
    return "return_to_office";
  }

  return "return_to_office";
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

function buildPinnedLocationFallback(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "Selected map location";
  }

  return `Pinned location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
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

function createEmptyLocationRestrictions() {
  return {
    destination: {
      isRestricted: false,
      message: "",
      matchedRule: null,
      matchedKeyword: "",
    },
    pickupLocation: {
      isRestricted: false,
      message: "",
      matchedRule: null,
      matchedKeyword: "",
    },
  };
}

function createRouteValidationState(input = {}) {
  return {
    isLoading: Boolean(input?.isLoading),
    valid:
      typeof input?.valid === "boolean"
        ? input.valid
        : input?.valid === null
        ? null
        : null,
    canCalculate:
      typeof input?.canCalculate === "boolean" ? input.canCalculate : Boolean(input?.route),
    message: String(input?.message || "").trim(),
    route: input?.route || null,
    error: String(input?.error || "").trim(),
    source: String(input?.source || "idle").trim() || "idle",
    failureType: String(input?.failureType || "").trim(),
    lastValidatedSignature: String(input?.lastValidatedSignature || "").trim(),
  };
}

function isConfirmedRouteValidationInvalid(result = {}) {
  if (result?.valid === false || result?.canContinue === false) {
    return true;
  }

  const message = String(result?.message || "").toLowerCase();
  return (
    message.includes("minimum duration") ||
    message.includes("too short") ||
    message.includes("does not meet") ||
    message.includes("requires a longer rental duration")
  );
}

function buildRouteValidationPayload({ schedule, locationPins }) {
  const pickupCoords = normalizeCoordinatePayload(locationPins?.pickup);
  const destinationCoords = normalizeCoordinatePayload(locationPins?.destination);

  return {
    pickupLocation: String(schedule?.pickupLocation || "").trim(),
    pickupCoords,
    destination: String(schedule?.destination || "").trim(),
    destinationCoords,
    startDate: schedule?.startDate || "",
    endDate: schedule?.endDate || "",
    startTime: schedule?.startTime || "",
    endTime: schedule?.endTime || "",
  };
}

function buildRouteValidationSignature(payload = {}) {
  return JSON.stringify({
    pickupLocation: payload.pickupLocation || "",
    pickupCoords: payload.pickupCoords || null,
    destination: payload.destination || "",
    destinationCoords: payload.destinationCoords || null,
    startDate: payload.startDate || "",
    endDate: payload.endDate || "",
    startTime: payload.startTime || "",
    endTime: payload.endTime || "",
  });
}

function isRouteValidationPayloadComplete(payload = {}) {
  return Boolean(
    payload.pickupLocation &&
      payload.destination &&
      payload.startDate &&
      payload.endDate &&
      payload.startTime &&
      payload.endTime
  );
}

function getRouteValidationSuccessMessage(routeValidation) {
  if (routeValidation?.message) return routeValidation.message;
  if (routeValidation?.route?.routeMinimumRequiredHours) {
    return `Trip duration accepted. Minimum required: ${routeValidation.route.routeMinimumRequiredHours} hours.`;
  }
  return "Trip duration accepted for this route.";
}

function getTimePickerMinimumDate(field, schedule) {
  const now = new Date();
  const roundedNow = ceilDateToThirtyMinutes(now) || now;

  if (field === "startTime") {
    if (!schedule?.startDate) return roundedNow;
    const startDateOnly = parseDateOnly(schedule.startDate);
    const today = parseDateOnly(now);

    if (startDateOnly && today && startDateOnly.getTime() === today.getTime()) {
      return roundedNow;
    }

    return undefined;
  }

  if (field === "endTime") {
    const endDateOnly = parseDateOnly(schedule?.endDate);
    const startDateTime = combineDateAndTime(schedule?.startDate, schedule?.startTime);
    const sameDay =
      Boolean(schedule?.startDate && schedule?.endDate) &&
      schedule.startDate === schedule.endDate;
    const minimumCandidates = [];
    const today = parseDateOnly(now);

    if (endDateOnly && today && endDateOnly.getTime() === today.getTime()) {
      minimumCandidates.push(roundedNow);
    }

    if (sameDay && startDateTime) {
      minimumCandidates.push(
        ceilDateToThirtyMinutes(new Date(startDateTime.getTime() + 30 * 60 * 1000))
      );
    }

    return minimumCandidates.length
      ? minimumCandidates.sort((a, b) => a.getTime() - b.getTime())[minimumCandidates.length - 1]
      : undefined;
  }

  return undefined;
}

function normalizeBudgetForPayload(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildRouteValidationPayloadFields(routeValidation) {
  if (!routeValidation?.route) return {};

  return {
    routeMinimumRequiredHours: routeValidation.route.routeMinimumRequiredHours,
    routeBookingDurationHours: routeValidation.route.routeBookingDurationHours,
    routeOneWayTravelHours: routeValidation.route.routeOneWayTravelHours,
    routeReturnTravelHours: routeValidation.route.routeReturnTravelHours,
    routeRoundTripTravelHours: routeValidation.route.routeRoundTripTravelHours,
    routeClearanceHours: routeValidation.route.routeClearanceHours,
    routeOneWayDistanceMeters: routeValidation.route.routeOneWayDistanceMeters,
    routeTravelTimeSource: routeValidation.route.routeTravelTimeSource,
    routeType: routeValidation.route.routeType,
    routeNote: routeValidation.route.routeNote,
  };
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
  const routeValidationRequestRef = useRef(0);
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
    normalizeTripType(incomingTrip?.tripType) ||
      (incomingTrip?.withDriver ? "with-driver" : "self-drive")
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
    formatPaymentMethodName(
      incomingTrip?.selectedPaymentMethodName ||
        incomingTrip?.paymentMethod ||
        route?.params?.paymentMethod ||
        ""
    )
  );
  const [paymentOption, setPaymentOption] = useState(
    incomingTrip?.paymentOption || route?.params?.paymentOption || ""
  );
  const [vehicleHandoffOption, setVehicleHandoffOption] = useState(() =>
    resolveInitialPickupOption(incomingTrip, route?.params || {})
  );
  const [returnArrangementType, setReturnArrangementType] = useState(() =>
    resolveInitialReturnArrangement(
      incomingTrip,
      route?.params || {},
      resolveInitialPickupOption(incomingTrip, route?.params || {})
    )
  );
  const [returnPickupAddress, setReturnPickupAddress] = useState(
    incomingTrip?.returnPickupAddress || route?.params?.returnPickupAddress || ""
  );
  const [returnPickupCoordinates, setReturnPickupCoordinates] = useState(() =>
    normalizeCoordinatePayload(
      incomingTrip?.returnPickupCoordinates ||
        incomingTrip?.returnPickupCoords ||
        route?.params?.returnPickupCoordinates ||
        route?.params?.returnPickupCoords
    )
  );
  const [returnPickupFee, setReturnPickupFee] = useState(
    incomingTrip?.returnPickupFee ?? route?.params?.returnPickupFee ?? ""
  );
  const [returnPickupFeeStatus, setReturnPickupFeeStatus] = useState(
    incomingTrip?.returnPickupFeeStatus || route?.params?.returnPickupFeeStatus || ""
  );
  const [returnNotes, setReturnNotes] = useState(
    incomingTrip?.returnNotes || route?.params?.returnNotes || ""
  );
  const [promoCode, setPromoCode] = useState(
    incomingTrip?.promoCode || route?.params?.promoCode || ""
  );
  const [promoFeedback, setPromoFeedback] = useState(() => ({
    status: incomingTrip?.promoFeedback?.status || "idle",
    message:
      incomingTrip?.promoFeedback?.message ||
      "Promo code will be validated before invoice issuance.",
  }));
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
  const [restrictedAreaRules, setRestrictedAreaRules] = useState(() =>
    normalizeRestrictedAreaRules(incomingTrip?.restrictedAreaRules || [])
  );
  const [restrictedAreasMeta, setRestrictedAreasMeta] = useState({
    isLoading: false,
    error: "",
    source: incomingTrip?.restrictedAreaRules?.length ? "backend" : "idle",
  });
  const [locationRestrictions, setLocationRestrictions] = useState(
    incomingTrip?.locationRestrictions || createEmptyLocationRestrictions()
  );
  const normalizedTripType = useMemo(() => normalizeTripType(tripType), [tripType]);
  const isWithDriver = useMemo(() => isWithDriverTrip(normalizedTripType), [normalizedTripType]);
  const isSelfDrive = useMemo(() => isSelfDriveTrip(normalizedTripType), [normalizedTripType]);
  const isReturnPickupRequested = useMemo(
    () =>
      ["pickup_same_location", "pickup_different_location"].includes(returnArrangementType),
    [returnArrangementType]
  );
  const [routeValidation, setRouteValidation] = useState(() =>
    createRouteValidationState(incomingTrip?.routeValidation)
  );

  const [picker, setPicker] = useState(null);
  const [schedule, setSchedule] = useState(initialSchedule);
  const incomingTripPurpose =
    incomingTrip?.tripPurpose || incomingTrip?.purpose || incomingTrip?.purposeOfTravel || "";
  const resolvedTripPurpose = PURPOSE_OPTIONS.includes(incomingTripPurpose)
    ? incomingTripPurpose
    : incomingTripPurpose
    ? "Other"
    : "";
  const [preferences, setPreferences] = useState({
    passengers: Number(incomingTrip?.passengers || incomingTrip?.pax || incomingTrip?.numberOfPax || 2),
    budget: normalizeOptionalNumber(incomingTrip?.budget),
    luggageBags: normalizeNonNegativeCount(
      incomingTrip?.luggageBags ?? incomingTrip?.luggageCount
    ),
    luggageSize: incomingTrip?.luggageSize || incomingTrip?.luggage?.size || "",
    luggageWeightKg: normalizeOptionalNumber(
      incomingTrip?.luggageWeightKg ?? incomingTrip?.luggage?.weightKg
    ),
    transmission: incomingTrip?.transmission || "any",
    tripPurpose: resolvedTripPurpose,
    customPurpose:
      resolvedTripPurpose === "Other"
        ? incomingTrip?.customPurpose || incomingTripPurpose
        : incomingTrip?.customPurpose || "",
  });

  const purposeOfTravel =
    preferences.tripPurpose === "Other"
      ? preferences.customPurpose.trim()
      : preferences.tripPurpose;
  const heavyLuggageWarning = getHeavyLuggageWarning({
    luggageBags: preferences.luggageBags,
    luggageSize: preferences.luggageSize,
    luggageWeightKg: preferences.luggageWeightKg,
  });
  const passengerMax = isDirectBooking ? getVehicleSeatCapacity(selectedVehicle) : 12;
  const selectedVehicleRate = getVehicleDailyRate(selectedVehicle);
  const effectiveBudget = isDirectBooking
    ? selectedVehicleRate ?? normalizeOptionalNumber(preferences.budget)
    : normalizeOptionalNumber(preferences.budget);
  const rentalPricing = useMemo(
    () =>
      calculateRentalPricing({
        vehicle: selectedVehicle || incomingVehicle || {},
        pickupDateTime: buildLocalDateTime(schedule.startDate, schedule.startTime || "00:00"),
        returnDateTime: buildLocalDateTime(schedule.endDate, schedule.endTime || "00:00"),
        rentalType: normalizedTripType,
        tripType: normalizedTripType,
        withDriver: isWithDriver,
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
      isWithDriver,
      normalizedTripType,
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
  const selectedRentalDuration = useMemo(
    () =>
      calculateSelectedRentalDuration({
        startDate: schedule.startDate,
        startTime: schedule.startTime,
        endDate: schedule.endDate,
        endTime: schedule.endTime,
      }),
    [schedule.endDate, schedule.endTime, schedule.startDate, schedule.startTime]
  );
  const destinationGuidance = useMemo(
    () =>
      evaluateDestinationRules({
        destination: schedule.destination,
        coordinates: locationPins.destination,
      }),
    [locationPins.destination, schedule.destination]
  );
  const scheduleDateError = useMemo(() => getDateRangeError(schedule), [schedule]);
  const routeValidationPayload = useMemo(
    () =>
      buildRouteValidationPayload({
        schedule,
        locationPins,
      }),
    [locationPins, schedule]
  );
  const routeValidationSignature = useMemo(
    () => buildRouteValidationSignature(routeValidationPayload),
    [routeValidationPayload]
  );
  const isRouteValidationReady = useMemo(
    () => isRouteValidationPayloadComplete(routeValidationPayload),
    [routeValidationPayload]
  );
  const hasLocationRestriction =
    locationRestrictions.destination?.isRestricted || locationRestrictions.pickupLocation?.isRestricted;
  const isCurrentRouteValidation =
    routeValidation.lastValidatedSignature === routeValidationSignature;
  const localRouteRestrictionMessage =
    schedule.destination.trim() && !destinationGuidance.isAllowed
      ? destinationGuidance.warningMessage ||
        destinationGuidance.restrictionReason ||
        "This destination is restricted."
      : "";
  const localRouteDurationBlockingMessage =
    destinationGuidance.isAllowed &&
    selectedRentalDuration.isComplete &&
    selectedRentalDuration.rentalDays > 0 &&
    selectedRentalDuration.rentalDays < destinationGuidance.minimumRentalDays
      ? `This route requires at least ${destinationGuidance.minimumRentalDays} rental day${
          destinationGuidance.minimumRentalDays === 1 ? "" : "s"
        }. Please extend your end date/time.`
      : "";
  const routeValidationBlockingMessage =
    isCurrentRouteValidation &&
    routeValidation.source === "backend" &&
    routeValidation.valid === false
      ? routeValidation.message || "Trip duration does not meet the route minimum requirement."
      : "";
  const step2ValidationState = useMemo(() => {
    const hasDestination = Boolean(schedule.destination.trim());
    const hasDestinationCoords = Boolean(normalizeCoordinatePayload(locationPins.destination));
    const hasPickup = Boolean(schedule.pickupLocation.trim());
    const hasPickupCoords = Boolean(normalizeCoordinatePayload(locationPins.pickup));
    const hasStartDate = Boolean(schedule.startDate);
    const hasStartTime = Boolean(schedule.startTime);
    const hasEndDate = Boolean(schedule.endDate);
    const hasEndTime = Boolean(schedule.endTime);
    const isDateTimeValid = !scheduleDateError;
    const isRestrictedBlocked = Boolean(
      locationRestrictions.destination?.isRestricted || locationRestrictions.pickupLocation?.isRestricted
    );
    const isRouteChecking = Boolean(
      isRouteValidationReady &&
        isCurrentRouteValidation &&
        (routeValidation.isLoading || routeValidation.source === "pending")
    );
    const isRouteBlocked = Boolean(routeValidationBlockingMessage);

    let blockerReason = "";

    if (!hasDestination) {
      blockerReason = "Select a destination.";
    } else if (!hasPickup) {
      blockerReason = "Select a pickup location.";
    } else if (!hasStartDate || !hasStartTime || !hasEndDate || !hasEndTime) {
      blockerReason = "Select valid start and end date/time.";
    } else if (scheduleDateError) {
      blockerReason = scheduleDateError.message || "Select valid start and end date/time.";
    } else if (locationRestrictions.destination?.isRestricted) {
      blockerReason =
        locationRestrictions.destination.message || "This destination is restricted.";
    } else if (locationRestrictions.pickupLocation?.isRestricted) {
      blockerReason =
        locationRestrictions.pickupLocation.message || "This pickup location is restricted.";
    } else if (localRouteRestrictionMessage) {
      blockerReason = localRouteRestrictionMessage;
    } else if (localRouteDurationBlockingMessage) {
      blockerReason = localRouteDurationBlockingMessage;
    } else if (routeValidationBlockingMessage) {
      blockerReason = routeValidationBlockingMessage;
    }

    return {
      hasDestination,
      hasDestinationCoords,
      hasPickup,
      hasPickupCoords,
      hasStartDate,
      hasStartTime,
      hasEndDate,
      hasEndTime,
      isDateTimeValid,
      isRestrictedBlocked,
      isRouteBlocked,
      isRouteChecking,
      blockerReason,
      canContinue: !blockerReason,
    };
  }, [
    destinationGuidance.isAllowed,
    destinationGuidance.restrictionReason,
    destinationGuidance.warningMessage,
    isRouteValidationReady,
    locationPins.destination,
    locationPins.pickup,
    locationRestrictions.destination?.isRestricted,
    locationRestrictions.destination?.message,
    locationRestrictions.pickupLocation?.isRestricted,
    locationRestrictions.pickupLocation?.message,
    routeValidation.isLoading,
    routeValidation.lastValidatedSignature,
    routeValidation.source,
    routeValidation.valid,
    routeValidationBlockingMessage,
    routeValidationSignature,
    schedule.destination,
    schedule.endDate,
    schedule.endTime,
    schedule.pickupLocation,
    schedule.startDate,
    schedule.startTime,
    localRouteDurationBlockingMessage,
    localRouteRestrictionMessage,
    scheduleDateError,
  ]);
  const shouldDisableContinue = currentStep === 2 ? !step2ValidationState.canContinue : false;
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
        const normalizedMethods = dedupePaymentMethods(
          Array.isArray(res?.paymentMethods) ? res.paymentMethods : []
        );
        setPaymentMethods(normalizedMethods);
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
    let isMounted = true;

    const loadRestrictedAreas = async () => {
      try {
        setRestrictedAreasMeta({
          isLoading: true,
          error: "",
          source: "idle",
        });
        const response = await getActiveRestrictedAreas();
        if (!isMounted) return;

        const normalizedRules = normalizeRestrictedAreaRules(
          response?.restrictedAreas || response?.rules || response?.data || response || []
        );

        if (normalizedRules.length) {
          setRestrictedAreaRules(normalizedRules);
          setRestrictedAreasMeta({
            isLoading: false,
            error: "",
            source: "backend",
          });
          return;
        }

        setRestrictedAreaRules(getFallbackRestrictedAreaRules());
        setRestrictedAreasMeta({
          isLoading: false,
          error: "",
          source: "fallback",
        });
      } catch (error) {
        if (!isMounted) return;
        setRestrictedAreaRules(getFallbackRestrictedAreaRules());
        setRestrictedAreasMeta({
          isLoading: false,
          error: "Restricted area rules are temporarily unavailable. Using a local fallback list.",
          source: "fallback",
        });
      }
    };

    loadRestrictedAreas();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!paymentMethods.length) return;

    if (selectedPaymentMethodId) {
      const matchedMethod = paymentMethods.find(
        (method) =>
          String(method?._id || "") === String(selectedPaymentMethodId) ||
          getPaymentMethodSelectionKey(method) === String(selectedPaymentMethodId)
      );
      if (matchedMethod && paymentMethod !== matchedMethod.name) {
        setPaymentMethod(formatPaymentMethodName(matchedMethod.name));
      }
      return;
    }

    if (paymentMethod) {
      const matchedMethod = paymentMethods.find(
        (method) => String(method?.name || "").trim().toLowerCase() === String(paymentMethod).trim().toLowerCase()
      );
      if (matchedMethod) {
        setSelectedPaymentMethodId(matchedMethod._id || getPaymentMethodSelectionKey(matchedMethod));
        if (paymentMethod !== matchedMethod.name) {
          setPaymentMethod(formatPaymentMethodName(matchedMethod.name));
        }
        return;
      }
    }

    const fallbackMethod = paymentMethods[0];
    const fallbackSelectionKey = fallbackMethod?._id || getPaymentMethodSelectionKey(fallbackMethod);
    if (fallbackSelectionKey) {
      setSelectedPaymentMethodId(fallbackSelectionKey);
      setPaymentMethod(formatPaymentMethodName(fallbackMethod.name || ""));
    }
  }, [paymentMethod, paymentMethods, selectedPaymentMethodId]);

  useEffect(() => {
    if (!tripType) return;

    const canonicalTripType = normalizeTripType(tripType);
    if (canonicalTripType && canonicalTripType !== tripType) {
      setTripType(canonicalTripType);
    }
  }, [tripType]);

  useEffect(() => {
    const normalizedPickupOption = normalizePickupOptionValue(vehicleHandoffOption);

    if (isWithDriver) {
      if (vehicleHandoffOption !== "") {
        setVehicleHandoffOption("");
      }
      setErrors((prev) => ({ ...prev, vehicleHandoffOption: "" }));
      return;
    }

    if (normalizedPickupOption && normalizedPickupOption !== vehicleHandoffOption) {
      setVehicleHandoffOption(normalizedPickupOption);
      return;
    }

    if (!normalizedPickupOption) {
      setVehicleHandoffOption("pickup");
    }
  }, [isWithDriver, vehicleHandoffOption]);

  useEffect(() => {
    if (isWithDriver) {
      if (returnArrangementType !== "return_to_office") {
        setReturnArrangementType("return_to_office");
      }
      setErrors((prev) => ({ ...prev, returnArrangementType: "", returnPickupAddress: "" }));
      return;
    }

    const normalizedReturnArrangement = normalizeReturnArrangementValue(returnArrangementType, {
      vehicleHandoffOption,
      allowPickupSameLocation: true,
    });

    if (
      normalizedReturnArrangement &&
      normalizedReturnArrangement !== returnArrangementType
    ) {
      setReturnArrangementType(normalizedReturnArrangement);
      return;
    }

    if (!normalizedReturnArrangement) {
      setReturnArrangementType("return_to_office");
    }
  }, [isWithDriver, returnArrangementType, vehicleHandoffOption]);

  useEffect(() => {
    if (
      !isWithDriver &&
      vehicleHandoffOption !== "delivery" &&
      returnArrangementType === "pickup_same_location"
    ) {
      setReturnArrangementType("pickup_different_location");
    }
  }, [isWithDriver, returnArrangementType, vehicleHandoffOption]);

  useEffect(() => {
    if (returnArrangementType !== "pickup_different_location") {
      setErrors((prev) => ({ ...prev, returnPickupAddress: "" }));
    }
  }, [returnArrangementType]);

  useEffect(() => {
    if (__DEV__) {
      console.log("[VehicleHandoffOption][state]", {
        vehicleHandoffOption,
        hasVehicleHandoffOption: Boolean(normalizePickupOptionValue(vehicleHandoffOption)),
        source: normalizePickupOptionValue(
          incomingTrip?.vehicleHandoffOption ||
            incomingTrip?.pickupOption ||
            incomingTrip?.pickupDeliveryOption ||
            incomingTrip?.deliveryOption ||
            route?.params?.vehicleHandoffOption ||
            route?.params?.pickupOption
        )
          ? "incoming"
          : "default",
      });
    }
  }, [
    incomingTrip?.deliveryOption,
    incomingTrip?.pickupDeliveryOption,
    incomingTrip?.pickupOption,
    incomingTrip?.vehicleHandoffOption,
    route?.params?.pickupOption,
    route?.params?.vehicleHandoffOption,
    vehicleHandoffOption,
  ]);

  useEffect(() => {
    const effectiveReturnArrangement = isWithDriver
      ? "return_to_office"
      : normalizeReturnArrangementValue(returnArrangementType, {
          vehicleHandoffOption,
          allowPickupSameLocation: true,
        });

    if (__DEV__) {
      console.log("[ReturnArrangementType][state]", {
        rawTripType: tripType,
        normalizedTripType,
        isWithDriver,
        isSelfDrive,
        vehicleHandoffOption,
        returnArrangementType,
        effectiveReturnArrangement,
        hasReturnArrangementError: Boolean(errors?.returnArrangementType),
        hasReturnPickupAddress: Boolean(String(returnPickupAddress || "").trim()),
        hasReturnPickupCoordinates: Boolean(returnPickupCoordinates),
      });
    }
  }, [
    errors?.returnArrangementType,
    isSelfDrive,
    isWithDriver,
    normalizedTripType,
    returnArrangementType,
    returnPickupAddress,
    returnPickupCoordinates,
    tripType,
    vehicleHandoffOption,
  ]);

  useEffect(() => {
    const activeRules = restrictedAreaRules.length
      ? restrictedAreaRules
      : getFallbackRestrictedAreaRules();

    setLocationRestrictions({
      destination: evaluateRestrictedArea(schedule.destination, activeRules),
      pickupLocation: evaluateRestrictedArea(schedule.pickupLocation, activeRules),
    });
  }, [restrictedAreaRules, schedule.destination, schedule.pickupLocation]);

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
    if (!isRouteValidationReady || scheduleDateError) {
      routeValidationRequestRef.current += 1;
      setRouteValidation((prev) => {
        if (
          prev.source === "idle" &&
          !prev.isLoading &&
          prev.valid === null &&
          prev.lastValidatedSignature === ""
        ) {
          return prev;
        }

        return createRouteValidationState({
          source: "idle",
          message: "",
          error: "",
          route: null,
          valid: null,
          canCalculate: false,
          lastValidatedSignature: "",
        });
      });
      return undefined;
    }

    if (
      routeValidation.lastValidatedSignature === routeValidationSignature &&
      (routeValidation.isLoading ||
        routeValidation.source === "pending" ||
        routeValidation.source === "backend" ||
        routeValidation.source === "fallback")
    ) {
      return undefined;
    }

    const requestId = routeValidationRequestRef.current + 1;
    routeValidationRequestRef.current = requestId;

    setRouteValidation((prev) =>
      createRouteValidationState({
        ...prev,
        isLoading: false,
        valid: null,
        error: "",
        message: "",
        route: null,
        source: "pending",
        failureType: "",
        lastValidatedSignature: routeValidationSignature,
      })
    );

    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isMounted || routeValidationRequestRef.current !== requestId) return;

      setRouteValidation((prev) =>
        createRouteValidationState({
          ...prev,
          isLoading: true,
          valid: null,
          error: "",
          message: "",
          route: null,
          source: "pending",
          failureType: "",
          lastValidatedSignature: routeValidationSignature,
        })
      );

      try {
        const response = await estimateRouteMinimumDuration(routeValidationPayload);
        if (!isMounted || routeValidationRequestRef.current !== requestId) return;

        setRouteValidation(
          createRouteValidationState({
            valid: isConfirmedRouteValidationInvalid(response)
              ? false
              : typeof response?.valid === "boolean"
              ? response.valid
              : true,
            canCalculate: response?.canCalculate,
            message: response?.message || "",
            route: response?.route || null,
            source: "backend",
            failureType: "",
            lastValidatedSignature: routeValidationSignature,
          })
        );
      } catch (error) {
        if (!isMounted || routeValidationRequestRef.current !== requestId) return;

        const failureType = error?.isRouteValidationTimeout
          ? "timeout"
          : error?.response
          ? "server_error"
          : "network_error";

        setRouteValidation(
          createRouteValidationState({
            valid: null,
            canCalculate: false,
            message: ROUTE_VALIDATION_FALLBACK_MESSAGE,
            error: error?.response?.data?.message || error?.message || "Route validation failed.",
            route: null,
            source: "fallback",
            failureType,
            lastValidatedSignature: routeValidationSignature,
          })
        );
      }
    }, ROUTE_VALIDATION_DEBOUNCE);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    isRouteValidationReady,
    routeValidation.lastValidatedSignature,
    routeValidation.source,
    routeValidation.isLoading,
    routeValidationPayload,
    routeValidationSignature,
    scheduleDateError,
  ]);

  useEffect(() => {
    if (currentStep !== 2) return;

    console.log("[BookingStep2][canContinue]", {
      hasDestination: step2ValidationState.hasDestination,
      hasDestinationCoords: step2ValidationState.hasDestinationCoords,
      hasPickup: step2ValidationState.hasPickup,
      hasPickupCoords: step2ValidationState.hasPickupCoords,
      hasStartDate: step2ValidationState.hasStartDate,
      hasStartTime: step2ValidationState.hasStartTime,
      hasEndDate: step2ValidationState.hasEndDate,
      hasEndTime: step2ValidationState.hasEndTime,
      isDateTimeValid: step2ValidationState.isDateTimeValid,
      isRestrictedBlocked: step2ValidationState.isRestrictedBlocked,
      isRouteBlocked: step2ValidationState.isRouteBlocked,
      isRouteChecking: step2ValidationState.isRouteChecking,
      blockerReason: step2ValidationState.blockerReason,
      canContinue: step2ValidationState.canContinue,
    });
  }, [currentStep, step2ValidationState]);

  useEffect(() => {
    if (currentStep !== 2) return;

    const routeStatus = step2ValidationState.isRouteChecking
      ? "checking"
      : !isRouteValidationReady || Boolean(scheduleDateError)
      ? "skipped"
      : localRouteRestrictionMessage || localRouteDurationBlockingMessage
      ? "invalid"
      : isCurrentRouteValidation && routeValidation.source === "backend" && routeValidation.valid === false
      ? "invalid"
      : isCurrentRouteValidation && routeValidation.source === "backend" && routeValidation.valid === true
      ? "valid"
      : isCurrentRouteValidation && routeValidation.source === "fallback" && routeValidation.failureType === "timeout"
      ? "timeout"
      : isCurrentRouteValidation && routeValidation.source === "fallback"
      ? "network_error"
      : "skipped";
    const routeSource = localRouteRestrictionMessage || localRouteDurationBlockingMessage
      ? "local"
      : isCurrentRouteValidation && routeValidation.source === "backend"
      ? "backend"
      : isCurrentRouteValidation && routeValidation.source === "fallback"
      ? "fallback"
      : "local";

    console.log("[RouteValidation][mobile]", {
      status: routeStatus,
      canContinue: step2ValidationState.canContinue,
      blockerReason: step2ValidationState.blockerReason || "",
      source: routeSource,
      message:
        routeSource === "local"
          ? localRouteDurationBlockingMessage || localRouteRestrictionMessage || ""
          : isCurrentRouteValidation
          ? routeValidation.message || ""
          : "",
    });
  }, [
    currentStep,
    isCurrentRouteValidation,
    isRouteValidationReady,
    localRouteDurationBlockingMessage,
    localRouteRestrictionMessage,
    routeValidation.failureType,
    routeValidation.message,
    routeValidation.source,
    routeValidation.valid,
    scheduleDateError,
    step2ValidationState.blockerReason,
    step2ValidationState.canContinue,
    step2ValidationState.isRouteChecking,
  ]);

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
      const budgetLimit = normalizeOptionalNumber(preferences.budget);

      if (vehicle.isActive === false) return false;
      if (status && ["unavailable", "maintenance", "booked"].includes(status)) return false;
      if (seats && seats < preferences.passengers) return false;
      if (budgetLimit !== "" && rate && rate > budgetLimit) return false;
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
  const selectedVehicleFit = useMemo(
    () =>
      selectedVehicle
        ? getVehicleLuggageFit(selectedVehicle, {
            passengers: preferences.passengers,
            luggageBags: preferences.luggageBags,
            luggageSize: preferences.luggageSize,
            luggageWeightKg: preferences.luggageWeightKg,
          })
        : null,
    [
      preferences.luggageBags,
      preferences.luggageSize,
      preferences.luggageWeightKg,
      preferences.passengers,
      selectedVehicle,
    ]
  );

  useEffect(() => {
    const currentField =
      activeLocationField === "destination" || activeLocationField === "pickupLocation"
        ? activeLocationField
        : "";

    if (!currentField) {
      setIsLoadingDestinationSuggestions(false);
      setIsLoadingPickupSuggestions(false);
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

    if (!hasGooglePlacesApiKey()) {
      if (currentField === "destination") {
        setDestinationSuggestions([]);
        setIsLoadingDestinationSuggestions(false);
      } else {
        setPickupSuggestions([]);
        setIsLoadingPickupSuggestions(false);
      }

      setLocationSuggestionsError((prev) => ({
        ...prev,
        [currentField]: GOOGLE_PLACES_CONFIG_MESSAGE,
      }));
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
    }, 300);

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

  const applyResolvedLocationSelection = (fieldKey, selection, fallbackLabel = "") => {
    const pinKey = fieldKey === "destination" ? "destination" : "pickup";
    const resolvedLabel = getResolvedLocationLabel(selection, fallbackLabel);

    setHasEditedSchedule(true);
    setSchedule((prev) => ({
      ...prev,
      [fieldKey]: resolvedLabel || fallbackLabel || prev[fieldKey],
    }));
    setLocationPins((prev) => ({
      ...prev,
      [pinKey]:
        selection?.latitude != null && selection?.longitude != null
          ? {
              label:
                resolvedLabel ||
                fallbackLabel ||
                buildPinnedLocationFallback(selection?.latitude, selection?.longitude),
              address:
                resolvedLabel ||
                fallbackLabel ||
                buildPinnedLocationFallback(selection?.latitude, selection?.longitude),
              latitude: selection.latitude,
              longitude: selection.longitude,
              placeId: selection.placeId || "",
              source: selection.source || "suggestion",
            }
          : null,
    }));
    clearSuggestionState(fieldKey);
    setLocationSuggestionsError((prev) => ({ ...prev, [fieldKey]: "" }));
    setErrors((prev) => ({ ...prev, [fieldKey]: "" }));
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
    setErrors((prev) => ({
      ...prev,
      [key]: "",
      destinationRule: "",
      pickupLocationRule: "",
      routeValidation: "",
      endDate: key === "startDate" ? "" : prev.endDate,
      endTime: "",
    }));
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
      applyResolvedLocationSelection(
        fieldKey,
        selected,
        getSuggestionLabel(normalizedSuggestion)
      );
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
      applyResolvedLocationSelection(
        fieldKey,
        {
          ...result,
          source: "geocoded",
        },
        value
      );
    } catch {
      // Manual address remains valid even if geocoding fails.
    }
  };

  const handleSelectSuggestedDestination = async (place) => {
    setActiveLocationField("destination");
    updateSchedule("destination", place);

    if (!hasGooglePlacesApiKey()) return;

    try {
      const result = await geocodeAddress(place);
      if (!result?.latitude || !result?.longitude) return;
      applyResolvedLocationSelection(
        "destination",
        {
          ...result,
          source: "geocoded",
        },
        place
      );
    } catch {
      // Preserve the quick chip text even if geocoding is unavailable.
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
      if (shouldResolveTypedText && !hasGooglePlacesApiKey()) {
        setLocationPicker((prev) => ({
          ...prev,
          statusMessage: "",
          errorMessage: GOOGLE_PLACES_CONFIG_MESSAGE,
        }));
      }
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

    applyResolvedLocationSelection(
      scheduleKey,
      {
        latitude: pin?.latitude,
        longitude: pin?.longitude,
        address:
          nextAddress ||
          fallbackLabel ||
          buildPinnedLocationFallback(pin?.latitude, pin?.longitude),
        placeId: pin?.placeId,
        source: pin?.source || "pin",
      },
      nextAddress ||
        fallbackLabel ||
        buildPinnedLocationFallback(pin?.latitude, pin?.longitude)
    );
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
        budget: preferences.budget,
        luggageCount: preferences.luggageBags,
        luggageBags: preferences.luggageBags,
        bagCount: preferences.luggageBags,
        bags: preferences.luggageBags,
        luggageSize: preferences.luggageSize,
        luggageWeightKg: preferences.luggageWeightKg,
        luggage: {
          count: normalizeNonNegativeCount(preferences.luggageBags),
          size: preferences.luggageSize || "",
          weightKg: Number(preferences.luggageWeightKg || 0),
        },
        transmission: preferences.transmission,
        tripPurpose: preferences.tripPurpose,
        customPurpose: preferences.customPurpose,
        purposeOfTravel,
        withDriver: isWithDriver,
        tripType: normalizedTripType || tripType,
        vehicleHandoffOption,
        locationRestrictions,
        routeValidation,
        restrictedAreaRules:
          restrictedAreasMeta.source === "backend" ? restrictedAreaRules : [],
        promoCode,
        promoFeedback,
        returnArrangementType,
        returnPickupAddress,
        returnPickupCoordinates,
        returnPickupFee,
        returnPickupFeeStatus,
        returnNotes,
        restrictedAreaSource: restrictedAreasMeta.source,
      },
      paymentMethod,
      selectedPaymentMethodName: paymentMethod,
      paymentOption,
      vehicleHandoffOption,
      promoCode,
      promoFeedback,
      selectedPaymentMethodId,
      returnArrangementType,
      returnPickupAddress,
      returnPickupCoordinates,
      returnPickupFee,
      returnPickupFeeStatus,
      returnNotes,
      currentStep: currentStep >= 4 ? "review" : "payment",
    };
  };

  const handleApplyPromoCode = () => {
    const normalizedPromoCode = String(promoCode || "").trim();

    if (!normalizedPromoCode) {
      setPromoFeedback({
        status: "idle",
        message: "Promo code will be validated before invoice issuance.",
      });
      return;
    }

    // TODO: Connect promoCode to backend validation once endpoint is available.
    setPromoCode(normalizedPromoCode);
    setPromoFeedback({
      status: "info",
      message: "Promo code will be validated before invoice issuance.",
    });
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

  const applyReturnPickupPreset = (source) => {
    const sourceLocation =
      source === "pickup"
        ? {
            address: schedule.pickupLocation,
            coordinates: normalizeCoordinatePayload(locationPins.pickup),
          }
        : {
            address: schedule.destination,
            coordinates: normalizeCoordinatePayload(locationPins.destination),
          };

    setReturnPickupAddress(String(sourceLocation.address || "").trim());
    setReturnPickupCoordinates(sourceLocation.coordinates);
    setErrors((prev) => ({ ...prev, returnPickupAddress: "" }));
  };

  const handleReturnPickupAddressChange = (value) => {
    setReturnPickupAddress(value);
    setReturnPickupCoordinates(null);
    setErrors((prev) => ({ ...prev, returnPickupAddress: "" }));
  };

  const validateStep = () => {
    const nextErrors = {};

    if (currentStep === 1 && !tripType) {
      nextErrors.tripType = "Please select a trip type.";
    }

    if (currentStep === 2) {
      if (!step2ValidationState.hasDestination) {
        nextErrors.destination = "Destination is required.";
      }
      if (!step2ValidationState.hasPickup) {
        nextErrors.pickupLocation = "Pickup Location is required.";
      }
      if (!step2ValidationState.hasStartDate) nextErrors.startDate = "Start date is required.";
      if (!step2ValidationState.hasStartTime) nextErrors.startTime = "Start time is required.";
      if (!step2ValidationState.hasEndDate) nextErrors.endDate = "End date is required.";
      if (!step2ValidationState.hasEndTime) nextErrors.endTime = "End time is required.";
      if (scheduleDateError) nextErrors[scheduleDateError.field] = scheduleDateError.message;
      if (locationRestrictions.destination?.isRestricted) {
        nextErrors.destinationRule =
          locationRestrictions.destination.message ||
          "This destination is restricted for mobile booking.";
      }
      if (locationRestrictions.pickupLocation?.isRestricted) {
        nextErrors.pickupLocationRule =
          locationRestrictions.pickupLocation.message ||
          "This pickup location is restricted for mobile booking.";
      }
      if (!scheduleDateError && !hasLocationRestriction && localRouteRestrictionMessage) {
        nextErrors.destinationRule = localRouteRestrictionMessage;
      }
      if (
        !scheduleDateError &&
        !hasLocationRestriction &&
        !localRouteRestrictionMessage &&
        localRouteDurationBlockingMessage
      ) {
        nextErrors.routeValidation = localRouteDurationBlockingMessage;
      } else if (!scheduleDateError && !hasLocationRestriction && routeValidationBlockingMessage) {
        nextErrors.routeValidation = routeValidationBlockingMessage;
      }
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

    const normalizedTime = normalizeTimeToThirtyMinutes(value) || formatTimeValue(value);
    updateSchedule(picker, normalizedTime);
  };

  const buildPayload = async () => {
    const dateError = scheduleDateError || getDateRangeError(schedule);
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
    const routePayload = buildRouteValidationPayloadFields(routeValidation);
    const normalizedPassengers = clampPassengerCount(preferences.passengers, passengerMax);
    const normalizedBudget = normalizeBudgetForPayload(preferences.budget);
    const normalizedLuggageBags = normalizeNonNegativeCount(preferences.luggageBags);
    const normalizedLuggageWeightKg = Number(preferences.luggageWeightKg || 0);
    const normalizedLuggageSize = String(preferences.luggageSize || "").trim();
    const effectiveVehicleHandoffOption = isWithDriver
      ? ""
      : normalizePickupOptionValue(vehicleHandoffOption);
    const effectiveReturnArrangement = isWithDriver
      ? (
          // Backend currently requires returnArrangementType on submit. With-driver returns
          // are handled operationally by FleetX/driver, so mobile sends a safe
          // backend-compatible default until backend supports a driver-managed return type.
          "return_to_office"
        )
      : normalizeReturnArrangementValue(returnArrangementType, {
          vehicleHandoffOption: effectiveVehicleHandoffOption,
          allowPickupSameLocation: true,
        });
    const normalizedReturnPickupAddress = String(returnPickupAddress || "").trim();
    const effectiveReturnPickupCoordinates =
      returnArrangementType === "pickup_different_location"
        ? normalizeCoordinatePayload(returnPickupCoordinates)
        : null;
    const shouldUseDeliveryFields = !isWithDriver && effectiveVehicleHandoffOption === "delivery";

    if (isSelfDrive && !effectiveVehicleHandoffOption) {
      const error = new Error("Please choose how you want to receive the vehicle.");
      error.code = "MISSING_VEHICLE_HANDOFF_OPTION";
      error.field = "vehicleHandoffOption";
      throw error;
    }

    if (isSelfDrive && !effectiveReturnArrangement) {
      const error = new Error("Please select your return arrangement.");
      error.code = "MISSING_RETURN_ARRANGEMENT";
      error.field = "returnArrangementType";
      throw error;
    }

    if (effectiveReturnArrangement === "pickup_same_location" && effectiveVehicleHandoffOption !== "delivery") {
      const error = new Error(
        "Same-location vehicle pickup is only available when FleetX delivered the vehicle."
      );
      error.code = "INVALID_RETURN_ARRANGEMENT";
      error.field = "returnArrangementType";
      throw error;
    }

    if (
      effectiveReturnArrangement === "pickup_different_location" &&
      !normalizedReturnPickupAddress
    ) {
      const error = new Error(
        "Return pickup address is required when requesting vehicle pickup."
      );
      error.code = "MISSING_RETURN_PICKUP_ADDRESS";
      error.field = "returnPickupAddress";
      throw error;
    }

    const payload = {
      vehicleId: selectedVehicle?._id || selectedVehicle?.id,
      tripType: normalizedTripType || tripType,
      destination: String(schedule.destination || "").trim(),
      pickupLocation: String(schedule.pickupLocation || "").trim(),
      startDate: schedule.startDate,
      startTime: schedule.startTime,
      endDate: schedule.endDate,
      endTime: schedule.endTime,
      passengers: normalizedPassengers,
      passengerCount: normalizedPassengers,
      numberOfPax: normalizedPassengers,
      budget: normalizedBudget,
      luggageBags: normalizedLuggageBags,
      bagCount: normalizedLuggageBags,
      bags: normalizedLuggageBags,
      luggageCount: normalizedLuggageBags,
      luggageSize: normalizedLuggageSize,
      luggageWeightKg: normalizedLuggageWeightKg,
      luggage: {
        count: normalizedLuggageBags,
        size: normalizedLuggageSize,
        weightKg: normalizedLuggageWeightKg,
      },
      purposeOfTravel,
      notes: isDirectBooking
        ? `Trip Type: ${getTripTypeLabel(normalizedTripType || tripType)}. Start Time: ${schedule.startTime}. End Time: ${schedule.endTime}. Transmission preference: ${preferences.transmission}. Billing label: ${rentalPricing.billingLabel || "Not set"}. Estimated total: ${totalPrice}.`
        : `Trip Type: ${getTripTypeLabel(normalizedTripType || tripType)}. Start Time: ${schedule.startTime}. End Time: ${schedule.endTime}. Transmission preference: ${preferences.transmission}. Budget target: ${effectiveBudget === "" ? "Not set" : effectiveBudget}. Billing label: ${rentalPricing.billingLabel || "Not set"}. Estimated total: ${totalPrice}.`,
      withDriver: isWithDriver,
      contact,
      selectedPaymentMethodId,
      selectedPaymentMethodName: paymentMethod,
      paymentMethod,
      paymentOption,
      vehicleHandoffOption: effectiveVehicleHandoffOption,
      returnArrangementType: effectiveReturnArrangement,
      currentStep: "submitted",
      ...(shouldUseDeliveryFields
        ? {
            deliveryAddress: String(schedule.pickupLocation || "").trim(),
            ...(pickupCoords ? { deliveryCoords: pickupCoords } : {}),
          }
        : {}),
      ...(effectiveReturnArrangement === "pickup_different_location"
        ? {
            returnPickupAddress: normalizedReturnPickupAddress,
            ...(effectiveReturnPickupCoordinates
              ? { returnPickupCoordinates: effectiveReturnPickupCoordinates }
              : {}),
          }
        : {}),
      ...(returnPickupFee !== "" && returnPickupFee !== null && returnPickupFee !== undefined
        ? {
            returnPickupFee: Number(returnPickupFee) || 0,
          }
        : {}),
      ...(String(returnPickupFeeStatus || "").trim()
        ? {
            returnPickupFeeStatus: String(returnPickupFeeStatus || "").trim(),
          }
        : {}),
      ...(String(returnNotes || "").trim()
        ? {
            returnNotes: String(returnNotes || "").trim(),
          }
        : {}),
      ...(Object.keys(routePayload).length
        ? {
            routeValidation: routePayload,
          }
        : {}),
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
      ...routePayload,
    };

    if (__DEV__) {
      console.log("[BookingPayload][handoffReturn]", {
        tripType: normalizedTripType || tripType,
        withDriver: isWithDriver,
        vehicleHandoffOption: effectiveVehicleHandoffOption,
        returnArrangementType: effectiveReturnArrangement,
        hasReturnPickupAddress: Boolean(normalizedReturnPickupAddress),
        hasReturnPickupCoordinates: Boolean(effectiveReturnPickupCoordinates),
      });
    }

    return payload;
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

      if (isSelfDrive && !normalizePickupOptionValue(vehicleHandoffOption)) {
        setErrors((prev) => ({
          ...prev,
          vehicleHandoffOption: "Please choose how you want to receive the vehicle.",
        }));
        return;
      }

      const effectiveReturnArrangement = isWithDriver
        ? "return_to_office"
        : normalizeReturnArrangementValue(returnArrangementType, {
            vehicleHandoffOption,
            allowPickupSameLocation: true,
          });
      if (isSelfDrive && !effectiveReturnArrangement) {
        setErrors((prev) => ({
          ...prev,
          returnArrangementType: "Please select your return arrangement.",
        }));
        return;
      }

      if (
        isSelfDrive &&
        effectiveReturnArrangement === "pickup_same_location" &&
        vehicleHandoffOption !== "delivery"
      ) {
        setErrors((prev) => ({
          ...prev,
          returnArrangementType:
            "Same-location vehicle pickup is only available when FleetX delivered the vehicle.",
        }));
        return;
      }

      if (
        isSelfDrive &&
        effectiveReturnArrangement === "pickup_different_location" &&
        !String(returnPickupAddress || "").trim()
      ) {
        setErrors((prev) => ({
          ...prev,
          returnPickupAddress:
            "Return pickup address is required when requesting vehicle pickup.",
        }));
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

      if (
        [
          "MISSING_VEHICLE_HANDOFF_OPTION",
          "MISSING_RETURN_ARRANGEMENT",
          "INVALID_RETURN_ARRANGEMENT",
          "MISSING_RETURN_PICKUP_ADDRESS",
        ].includes(err?.code)
      ) {
        setErrors((prev) => ({
          ...prev,
          [err.field || "returnArrangementType"]: err.message,
        }));
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

      const responseData = err?.response?.data;
      const structuredErrors = responseData?.errors;
      const structuredMessage = Array.isArray(structuredErrors)
        ? structuredErrors.find((value) => typeof value === "string") || ""
        : structuredErrors && typeof structuredErrors === "object"
        ? Object.values(structuredErrors)
            .flat()
            .find((value) => typeof value === "string") || ""
        : "";
      const message =
        responseData?.message ||
        responseData?.error ||
        structuredMessage ||
        err.message ||
        "Booking failed.";

      if (responseData) {
        if (
          /vehicle handoff/i.test(message) ||
          /pickup\/delivery/i.test(message) ||
          /pickup option/i.test(message)
        ) {
          setErrors((prev) => ({ ...prev, vehicleHandoffOption: message }));
          return;
        }

        if (/return pickup address/i.test(message)) {
          setErrors((prev) => ({ ...prev, returnPickupAddress: message }));
          return;
        }

        if (/return arrangement/i.test(message) || /same-location vehicle pickup/i.test(message)) {
          setErrors((prev) => ({
            ...prev,
            returnArrangementType: message,
          }));
          return;
        }
      }

      if (/return arrangement is required/i.test(message)) {
        setErrors((prev) => ({
          ...prev,
          returnArrangementType: message,
        }));
        return;
      }
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
                        const active = normalizedTripType === option.id;
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
        luggageCount: preferences.luggageBags,
        luggageBags: preferences.luggageBags,
        bagCount: preferences.luggageBags,
        bags: preferences.luggageBags,
        luggageSize: preferences.luggageSize,
        luggageWeightKg: preferences.luggageWeightKg,
        tripPurpose: preferences.tripPurpose,
        customPurpose: preferences.customPurpose,
        purposeOfTravel,
        locationRestrictions,
        routeValidation,
        restrictedAreaRules:
          restrictedAreasMeta.source === "backend" ? restrictedAreaRules : [],
        promoCode,
        promoFeedback,
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
            onFocus={() => {
              setActiveLocationField("destination");
              handleInputFocus("destination");
            }}
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
        {!errors.destinationRule &&
        !locationRestrictions.destination?.isRestricted &&
        schedule.destination.trim() &&
        destinationGuidance.warningMessage ? (
          <Text
            style={[
              styles.locationHelperErrorText,
              destinationGuidance.isAllowed && styles.locationGuidanceText,
            ]}
          >
            {destinationGuidance.isAllowed
              ? destinationGuidance.warningMessage
              : destinationGuidance.restrictionReason || destinationGuidance.warningMessage}
          </Text>
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
        {!!errors.destinationRule && <Text style={styles.errorText}>{errors.destinationRule}</Text>}
        {!errors.destinationRule && locationRestrictions.destination?.isRestricted ? (
          <View style={styles.inlineNoticeError}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.inlineNoticeErrorText}>
              {locationRestrictions.destination.message}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.chipsWrap}>
        {SUGGESTED_DESTINATIONS.map((place) => (
          <TouchableOpacity
            key={place}
            style={[styles.chip, schedule.destination === place && styles.chipActive]}
            onPress={() => handleSelectSuggestedDestination(place)}
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
            onFocus={() => {
              setActiveLocationField("pickupLocation");
              handleInputFocus("pickupLocation");
            }}
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
        {!!errors.pickupLocationRule && (
          <Text style={styles.errorText}>{errors.pickupLocationRule}</Text>
        )}
        {!errors.pickupLocationRule && locationRestrictions.pickupLocation?.isRestricted ? (
          <View style={styles.inlineNoticeError}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.inlineNoticeErrorText}>
              {locationRestrictions.pickupLocation.message}
            </Text>
          </View>
        ) : null}
      </View>

      {restrictedAreasMeta.error ? (
        <View style={styles.inlineNoticeWarning}>
          <Ionicons name="information-circle-outline" size={18} color="#B45309" />
          <Text style={styles.inlineNoticeWarningText}>{restrictedAreasMeta.error}</Text>
        </View>
      ) : null}

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

      {step2ValidationState.isRouteChecking ? (
        <View style={styles.inlineNoticeInfo}>
          <Ionicons name="time-outline" size={18} color="#1D4ED8" />
          <Text style={styles.inlineNoticeInfoText}>
            Checking route timing...
          </Text>
        </View>
      ) : null}

      {!routeValidation.isLoading && errors.routeValidation ? (
        <View style={styles.inlineNoticeError}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.inlineNoticeErrorText}>{errors.routeValidation}</Text>
        </View>
      ) : null}

      {!routeValidation.isLoading &&
      !errors.routeValidation &&
      isRouteValidationReady &&
      isCurrentRouteValidation &&
      routeValidation.source === "backend" &&
      routeValidation.valid === true ? (
        <View style={styles.inlineNoticeSuccess}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#15803D" />
          <Text style={styles.inlineNoticeSuccessText}>
            {getRouteValidationSuccessMessage(routeValidation)}
          </Text>
        </View>
      ) : null}

      {!routeValidation.isLoading &&
      !errors.routeValidation &&
      isRouteValidationReady &&
      isCurrentRouteValidation &&
      routeValidation.source === "fallback" ? (
        <View style={styles.inlineNoticeWarning}>
          <Ionicons name="warning-outline" size={18} color="#B45309" />
          <Text style={styles.inlineNoticeWarningText}>
            {routeValidation.message || ROUTE_VALIDATION_FALLBACK_MESSAGE}
          </Text>
        </View>
      ) : null}

      {!!schedule.destination.trim() && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Trip guidance</Text>
          <Text style={styles.summaryValue}>
            Destination type: {getDestinationCategoryLabel(destinationGuidance.distanceCategory)}
          </Text>
          <Text style={styles.summaryValue}>
            Minimum rental: {destinationGuidance.minimumRentalDays}{" "}
            {destinationGuidance.minimumRentalDays === 1 ? "day" : "days"}
          </Text>
          <Text style={styles.summaryValue}>
            Selected duration:{" "}
            {selectedRentalDuration.isComplete && selectedRentalDuration.rentalDays > 0
              ? `${selectedRentalDuration.rentalDays} ${selectedRentalDuration.rentalDays === 1 ? "day" : "days"}`
              : "Complete your schedule"}
          </Text>
          <Text style={styles.summaryLabel}>
            {routeValidation.source === "backend" && routeValidation.route?.routeNote
              ? routeValidation.route.routeNote
              : destinationGuidance.restrictionReason ||
                destinationGuidance.warningMessage ||
                destinationGuidance.estimatedTravelNote ||
                DEFAULT_ROUTE_GUIDANCE_MESSAGE}
          </Text>
        </View>
      )}
    </View>
  );

  const renderInlineActions = () => (
    <View>
      {currentStep === 2 && shouldDisableContinue && step2ValidationState.blockerReason ? (
        <View
          style={
            step2ValidationState.isRouteChecking
              ? styles.inlineNoticeInfo
              : styles.inlineNoticeError
          }
        >
          <Ionicons
            name={step2ValidationState.isRouteChecking ? "time-outline" : "alert-circle-outline"}
            size={18}
            color={step2ValidationState.isRouteChecking ? "#1D4ED8" : "#DC2626"}
          />
          <Text
            style={
              step2ValidationState.isRouteChecking
                ? styles.inlineNoticeInfoText
                : styles.inlineNoticeErrorText
            }
          >
            {step2ValidationState.blockerReason}
          </Text>
        </View>
      ) : null}
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
            style={[
              styles.primaryButton,
              isCompactScreen && styles.inlineActionButtonFull,
              shouldDisableContinue && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            activeOpacity={0.9}
            disabled={shouldDisableContinue}
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
            <Text style={styles.controlValue}>
              {preferences.budget === "" ? "Optional" : formatPeso(preferences.budget)}
            </Text>
          </View>
          <View onLayout={(event) => handleFieldLayout("budget", event)}>
            <View style={styles.inputWrap}>
              <Feather name="credit-card" size={18} color="#98A2B3" />
              <TextInput
                value={preferences.budget === "" ? "" : String(preferences.budget)}
                onChangeText={(value) => {
                  const cleaned = value.replace(/[^0-9]/g, "");
                  updatePreference("budget", cleaned ? Number(cleaned) : "");
                }}
                placeholder="Optional budget in PHP"
                placeholderTextColor="#98A2B3"
                style={styles.input}
                keyboardType="number-pad"
                onFocus={() => handleInputFocus("budget")}
              />
              {preferences.budget !== "" ? (
                <TouchableOpacity
                  onPress={() => updatePreference("budget", "")}
                  hitSlop={SMALL_HIT_SLOP}
                  activeOpacity={0.85}
                >
                  <Text style={styles.exitText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <Text
            style={{
              color: "#667085",
              fontSize: 13,
              lineHeight: 19,
              marginTop: 10,
            }}
          >
            Leave this blank if you want to see all matching vehicles.
          </Text>
        </View>
      )}

      <Text style={styles.label}>Luggage Bags</Text>
      <View style={styles.compactGrid}>
        {Array.from({ length: 11 }, (_, index) => index).map((count) => (
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

      <Text style={styles.label}>Luggage Size</Text>
      <View style={styles.segmentRow}>
        {["Small", "Medium", "Large", "Extra Large"].map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.segment, preferences.luggageSize === item && styles.segmentActive]}
            onPress={() => updatePreference("luggageSize", item)}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, preferences.luggageSize === item && styles.segmentTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {preferences.luggageBags === 0 ? (
        <Text style={styles.locationHelperText}>
          Luggage size is optional when no bags are selected.
        </Text>
      ) : null}

      <View onLayout={(event) => handleFieldLayout("luggageWeightKg", event)}>
        <Text style={styles.label}>Estimated Luggage Weight (kg)</Text>
        <View style={styles.inputWrap}>
          <MaterialCommunityIcons name="weight-kilogram" size={18} color="#98A2B3" />
          <TextInput
            value={preferences.luggageWeightKg === "" ? "" : String(preferences.luggageWeightKg)}
            onChangeText={(value) => {
              const cleaned = value.replace(/[^0-9.]/g, "");
              updatePreference("luggageWeightKg", cleaned ? cleaned : "");
            }}
            placeholder={preferences.luggageBags > 0 ? "Optional total luggage weight" : "Optional"}
            placeholderTextColor="#98A2B3"
            style={styles.input}
            keyboardType="decimal-pad"
            onFocus={() => handleInputFocus("luggageWeightKg")}
          />
        </View>
      </View>
      {heavyLuggageWarning ? (
        <View style={styles.inlineNoticeWarning}>
          <Ionicons name="warning-outline" size={18} color="#B45309" />
          <Text style={styles.inlineNoticeWarningText}>{heavyLuggageWarning}</Text>
        </View>
      ) : null}

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
    const vehicleFit = getVehicleLuggageFit(vehicle, {
      passengers: preferences.passengers,
      luggageBags: preferences.luggageBags,
      luggageSize: preferences.luggageSize,
      luggageWeightKg: preferences.luggageWeightKg,
    });

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
        <View style={styles.vehicleFitCard}>
          <Text style={styles.vehicleFitPrimary}>{vehicleFit.recommendation}</Text>
          <Text style={styles.vehicleFitSecondary}>{vehicleFit.passengerMessage}</Text>
          <Text style={styles.vehicleFitSecondary}>{vehicleFit.luggageMessage}</Text>
        </View>
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
        {selectedVehicleFit ? (
          <View style={styles.vehicleFitCard}>
            <Text style={styles.vehicleFitPrimary}>{selectedVehicleFit.recommendation}</Text>
            <Text style={styles.vehicleFitSecondary}>{selectedVehicleFit.passengerMessage}</Text>
            <Text style={styles.vehicleFitSecondary}>{selectedVehicleFit.luggageMessage}</Text>
          </View>
        ) : null}
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
        Filtered by trip type, passenger count, optional budget, transmission, and current vehicle status where available.
      </Text>

      {vehiclesLoading ? (
        <Text style={styles.emptyText}>Loading available vehicles...</Text>
      ) : recommendedVehicles.length ? (
        recommendedVehicles.map(renderVehicleCard)
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No matching vehicles found</Text>
          <Text style={styles.emptyText}>
            Go back and adjust your passengers, budget preference, or transmission filter.
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
    ["Trip Type", getTripTypeLabel(normalizedTripType || tripType)],
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
    ["Destination Type", getDestinationCategoryLabel(destinationGuidance.distanceCategory)],
    ["Minimum Rental", `${destinationGuidance.minimumRentalDays} ${destinationGuidance.minimumRentalDays === 1 ? "day" : "days"}`],
    [
      "Selected Rental",
      selectedRentalDuration.isComplete && selectedRentalDuration.rentalDays > 0
        ? `${selectedRentalDuration.rentalDays} ${selectedRentalDuration.rentalDays === 1 ? "day" : "days"}`
        : "Complete your schedule",
    ],
    ["Passengers", `${preferences.passengers}`],
    ...(preferences.budget === ""
      ? []
      : [["Budget", formatPeso(preferences.budget)]]),
    [
      "Luggage",
      formatLuggageSummaryText({
        luggageBags: preferences.luggageBags,
        luggageSize: preferences.luggageSize,
        luggageWeightKg: preferences.luggageWeightKg,
      }),
    ],
    ["Transmission", preferences.transmission === "any" ? "Any" : preferences.transmission],
    ["Trip Purpose", purposeOfTravel || "Not set"],
    [
      "Trip Guidance",
      (routeValidation.route?.routeNote ||
        routeValidation.message) ||
        destinationGuidance.restrictionReason ||
        destinationGuidance.warningMessage ||
        destinationGuidance.estimatedTravelNote ||
        "Destination accepted. Your trip duration looks reasonable.",
    ],
    [
      "Pickup / Delivery Option",
      PICKUP_OPTION_OPTIONS.find(
        (option) => option.value === normalizePickupOptionValue(vehicleHandoffOption)
      )?.label || "Not selected",
    ],
    ...(isSelfDrive
      ? [[
          "Return Arrangement",
          RETURN_ARRANGEMENT_OPTIONS.find(
            (option) =>
              option.value ===
              (normalizeReturnArrangementValue(returnArrangementType, {
                vehicleHandoffOption,
                allowPickupSameLocation: false,
              }) === "pickup_different_location"
                ? "request_vehicle_pickup"
                : "return_to_office")
          )?.label || "Not selected",
        ]]
      : []),
    ...(isSelfDrive && returnArrangementType === "pickup_same_location"
      ? [["Return Pickup Location", "Same as delivery location"]]
      : []),
    ...(isSelfDrive && returnArrangementType === "pickup_different_location"
      ? [["Return Pickup Address", String(returnPickupAddress || "").trim() || "Not set"]]
      : []),
    ...(String(promoCode || "").trim()
      ? [["Promo Code", String(promoCode || "").trim().toUpperCase()]]
      : []),
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
                : getTimePickerMinimumDate(picker, schedule)
            }
            display="default"
            minuteInterval={30}
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

                {isSelfDrive ? (
                  <View style={styles.paymentSection}>
                    <Text style={styles.cardTitle}>Vehicle handoff</Text>
                    <Text style={styles.cardSubtitle}>
                      Choose how the vehicle will be received and returned.
                    </Text>

                    <View style={styles.returnArrangementSection}>
                      <Text style={styles.promoLabel}>Pickup / delivery option</Text>
                      <Text style={styles.paymentHelperText}>
                        Choose how you want to receive the vehicle.
                      </Text>

                      <View style={styles.paymentOptionGrid}>
                        {PICKUP_OPTION_OPTIONS.map((option) => {
                          const isSelected = vehicleHandoffOption === option.value;

                          return (
                            <TouchableOpacity
                              key={option.value}
                              style={[
                                styles.paymentOptionCard,
                                isSelected && styles.paymentOptionCardSelected,
                              ]}
                              onPress={() => {
                                setVehicleHandoffOption(option.value);
                                setErrors((prev) => ({ ...prev, vehicleHandoffOption: "" }));
                              }}
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

                      {errors.vehicleHandoffOption ? (
                        <Text style={styles.errorText}>{errors.vehicleHandoffOption}</Text>
                      ) : null}
                    </View>

                    <View style={styles.returnArrangementSection}>
                      <Text style={styles.promoLabel}>Return arrangement</Text>
                      <Text style={styles.paymentHelperText}>
                        Choose how the vehicle will be returned after your trip.
                      </Text>

                      <View style={styles.paymentOptionGrid}>
                        {RETURN_ARRANGEMENT_OPTIONS.map((option) => {
                          const optionValue =
                            option.value === "request_vehicle_pickup"
                              ? vehicleHandoffOption === "delivery"
                                ? "pickup_same_location"
                                : "pickup_different_location"
                              : option.value;
                          const isSelected =
                            option.value === "request_vehicle_pickup"
                              ? isReturnPickupRequested
                              : returnArrangementType === optionValue;

                          return (
                            <TouchableOpacity
                              key={option.value}
                              style={[
                                styles.paymentOptionCard,
                                isSelected && styles.paymentOptionCardSelected,
                              ]}
                              onPress={() => {
                                setReturnArrangementType(optionValue);
                                setErrors((prev) => ({
                                  ...prev,
                                  returnArrangementType: "",
                                  returnPickupAddress: "",
                                }));
                              }}
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

                      {isReturnPickupRequested && vehicleHandoffOption === "delivery" ? (
                        <View style={styles.paymentOptionGrid}>
                          <TouchableOpacity
                            style={[
                              styles.paymentOptionCard,
                              returnArrangementType === "pickup_same_location" &&
                                styles.paymentOptionCardSelected,
                            ]}
                            onPress={() => {
                              setReturnArrangementType("pickup_same_location");
                              setErrors((prev) => ({
                                ...prev,
                                returnArrangementType: "",
                                returnPickupAddress: "",
                              }));
                            }}
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[
                                styles.paymentOptionText,
                                returnArrangementType === "pickup_same_location" &&
                                  styles.paymentOptionTextSelected,
                              ]}
                            >
                              Pick up from the same delivery location
                            </Text>
                            <Text style={styles.paymentHelperText}>
                              FleetX will pick up the vehicle from the delivery address on file.
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.paymentOptionCard,
                              returnArrangementType === "pickup_different_location" &&
                                styles.paymentOptionCardSelected,
                            ]}
                            onPress={() => {
                              setReturnArrangementType("pickup_different_location");
                              setErrors((prev) => ({
                                ...prev,
                                returnArrangementType: "",
                              }));
                            }}
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[
                                styles.paymentOptionText,
                                returnArrangementType === "pickup_different_location" &&
                                  styles.paymentOptionTextSelected,
                              ]}
                            >
                              Pick up from a different location
                            </Text>
                            <Text style={styles.paymentHelperText}>
                              Use a different return pickup address for FleetX.
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {returnArrangementType === "pickup_different_location" ? (
                        <View style={styles.promoSection}>
                          <Text style={styles.promoLabel}>Return pickup address</Text>
                          <Text style={styles.paymentHelperText}>
                            Required when requesting vehicle pickup.
                          </Text>
                          <View style={styles.paymentOptionGrid}>
                            <TouchableOpacity
                              style={styles.paymentOptionCard}
                              onPress={() => applyReturnPickupPreset("pickup")}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.paymentOptionText}>Use pickup location</Text>
                              <Text style={styles.paymentHelperText}>
                                {schedule.pickupLocation || "Pickup location not set"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.paymentOptionCard}
                              onPress={() => applyReturnPickupPreset("destination")}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.paymentOptionText}>Use destination</Text>
                              <Text style={styles.paymentHelperText}>
                                {schedule.destination || "Destination not set"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.promoInputWrap}>
                            <Feather name="map-pin" size={16} color="#98A2B3" />
                            <TextInput
                              value={returnPickupAddress}
                              onChangeText={handleReturnPickupAddressChange}
                              autoCapitalize="words"
                              autoCorrect={false}
                              placeholder="Enter return pickup address"
                              placeholderTextColor="#98A2B3"
                              style={styles.promoInput}
                            />
                          </View>
                          {errors.returnPickupAddress ? (
                            <Text style={styles.errorText}>{errors.returnPickupAddress}</Text>
                          ) : null}
                        </View>
                      ) : null}

                      {errors.returnArrangementType ? (
                        <Text style={styles.errorText}>{errors.returnArrangementType}</Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}

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
                          const methodSelectionKey =
                            String(method?._id || "") || getPaymentMethodSelectionKey(method);
                          const isSelected = selectedPaymentMethodId === methodSelectionKey;

                          return (
                            <TouchableOpacity
                              key={methodSelectionKey}
                              style={[
                                styles.paymentOptionCard,
                                isSelected && styles.paymentOptionCardSelected,
                              ]}
                              onPress={() => {
                                setSelectedPaymentMethodId(methodSelectionKey);
                                setPaymentMethod(formatPaymentMethodName(method?.name || ""));
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

                  <View style={styles.promoSection}>
                    <Text style={styles.promoLabel}>Promo code</Text>
                    <View style={styles.promoRow}>
                      <View style={styles.promoInputWrap}>
                        <Feather name="tag" size={16} color="#98A2B3" />
                        <TextInput
                          value={promoCode}
                          onChangeText={(value) => {
                            setPromoCode(value);
                            setPromoFeedback((prev) => ({
                              ...prev,
                              status: "idle",
                              message:
                                prev.message || "Promo code will be validated before invoice issuance.",
                            }));
                          }}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          placeholder="Enter promo code"
                          placeholderTextColor="#98A2B3"
                          style={styles.promoInput}
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.promoApplyButton}
                        activeOpacity={0.9}
                        onPress={handleApplyPromoCode}
                      >
                        <Text style={styles.promoApplyButtonText}>Apply</Text>
                      </TouchableOpacity>
                    </View>
                    <Text
                      style={[
                        styles.promoHelperText,
                        promoFeedback.status === "error" && styles.promoHelperTextError,
                        promoFeedback.status === "success" && styles.promoHelperTextSuccess,
                      ]}
                    >
                      {promoFeedback.message || "Promo code will be validated before invoice issuance."}
                    </Text>
                  </View>
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
