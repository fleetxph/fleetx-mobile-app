import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
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
import { isUnauthorizedError } from "../api/api";
import {
  createBooking,
  getClientProfile,
  getVehicles,
  getVehicleById,
  getVerificationStatus,
  saveClientBookingDraft,
  submitClientBookingDraft,
} from "../api/clientApi";
import { styles } from "../styles/bookingWizardStyle";
import { getDateRangeError, parseDateOnly } from "../utils/dateValidation";
import { getVehicleImageUrl } from "../utils/imageUrl";

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

function formatPeso(value) {
  return `PHP ${Number(value || 0).toLocaleString()}`;
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

function getSelectedDays(form) {
  const { startDate, startTime, endDate, endTime } = form;
  if (!startDate || !startTime || !endDate || !endTime) return 0;

  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end <= start) return 0;

  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
}

function getVehicleName(vehicle) {
  return `${vehicle?.make || ""} ${vehicle?.model || ""}`.trim() || "Vehicle";
}

function getTripTypeLabel(type) {
  return type === "self-drive" ? "Self-Drive" : "With Driver";
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
  const entryMode = route?.params?.entryMode || route?.params?.mode || "";
  const isDirectBooking =
    entryMode === "directVehicle" ||
    entryMode === "direct" ||
    route?.params?.mode === "direct" ||
    Boolean(route?.params?.selectedVehicle) ||
    Boolean(route?.params?.vehicleId) ||
    Boolean(incomingDraft);
  const totalSteps = 4;

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
  const [success, setSuccess] = useState(null);
  const [verificationLabel, setVerificationLabel] = useState("Not Verified");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [failedImages, setFailedImages] = useState({});

  const [picker, setPicker] = useState(null);
  const [schedule, setSchedule] = useState({
    destination: incomingTrip?.destination || "",
    pickupLocation: incomingTrip?.pickupLocation || "Makati City",
    startDate: incomingTrip?.startDate || toDateInput(pickupDate),
    startTime: incomingTrip?.startTime || "09:00",
    endDate: incomingTrip?.endDate || toDateInput(returnDate),
    endTime: incomingTrip?.endTime || "18:00",
  });
  const [preferences, setPreferences] = useState({
    passengers: Number(incomingTrip?.passengers || incomingTrip?.pax || incomingTrip?.numberOfPax || 2),
    budget: Number(incomingTrip?.budget || 5000),
    luggageBags: Number(incomingTrip?.luggageBags || 1),
    transmission: incomingTrip?.transmission || "any",
    tripPurpose: incomingTrip?.tripPurpose || incomingTrip?.purpose || incomingTrip?.purposeOfTravel || "",
    customPurpose: "",
  });

  const selectedDays = useMemo(() => getSelectedDays(schedule), [schedule]);
  const purposeOfTravel =
    preferences.tripPurpose === "Other"
      ? preferences.customPurpose.trim()
      : preferences.tripPurpose;
  const totalPrice = Number(selectedVehicle?.dailyRate || 0) * selectedDays;
  const isSelfDrive = tripType === "self-drive";

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

  const recommendedVehicles = useMemo(() => {
    const list = vehicles.filter((vehicle) => {
      const seats = Number(vehicle.seater || vehicle.seats || 0);
      const rate = Number(vehicle.dailyRate || 0);
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

    return list.sort((a, b) => Number(a.dailyRate || 0) - Number(b.dailyRate || 0));
  }, [vehicles, preferences]);

  const updateSchedule = (key, value) => {
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

  const updatePreference = (key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
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
      if (!selectedVehicle?._id) {
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

    return {
      vehicleId: selectedVehicle?._id,
      destination: schedule.destination,
      pickupLocation: schedule.pickupLocation,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      numberOfPax: preferences.passengers,
      luggageBags: preferences.luggageBags,
      purposeOfTravel,
      notes: `Trip Type: ${getTripTypeLabel(tripType)}. Start Time: ${schedule.startTime}. End Time: ${schedule.endTime}. Transmission preference: ${preferences.transmission}. Budget target: ${preferences.budget}.`,
      withDriver: tripType === "with-driver",
      contact,
      paymentMethod: "GCash",
      currentStep: "submitted",
    };
  };

  const submitBooking = async () => {
    try {
      const token = await AsyncStorage.getItem("clientToken");
      if (!token) {
        Alert.alert("Sign In Required", "Please sign in or register to submit this booking.", [
          { text: "Register", onPress: () => navigation.navigate("RegisterClient") },
          { text: "Sign In", onPress: () => navigation.navigate("ClientLogin") },
          { text: "Cancel", style: "cancel" },
        ]);
        return;
      }

      setSubmitLoading(true);
      const payload = await buildPayload();
      const res = incomingDraft?._id
        ? await submitClientBookingDraft(incomingDraft._id, payload)
        : await createBooking(payload);
      setReviewVisible(false);
      setSuccess(res?.booking || res);
    } catch (err) {
      if (err?.code === "MISSING_CONTACT") {
        Alert.alert("Contact number required", err.message, [
          {
            text: "Update Profile",
            onPress: () => navigation.navigate("PersonalInfo"),
          },
          { text: "Cancel", style: "cancel" },
        ]);
        return;
      }

      if (err?.code === "INVALID_DATE_RANGE") {
        setErrors((prev) => ({ ...prev, [err.field || "endDate"]: err.message }));
        Alert.alert("Invalid schedule", err.message);
        return;
      }

      if (isUnauthorizedError(err)) {
        Alert.alert("Session expired", "Please sign in again to continue.", [
          {
            text: "Sign In",
            onPress: () => navigation.navigate("ClientLogin"),
          },
        ]);
        return;
      }

      const message = err?.response?.data?.message || err.message || "Booking failed.";
      if (err?.response?.status === 403 && err?.response?.data?.verificationStatus) {
        try {
          const draftPayload = await buildPayload();
          await saveClientBookingDraft({ ...draftPayload, currentStep: "payment" });
        } catch (draftErr) {
          console.log("Save verification draft error:", draftErr?.response?.data || draftErr.message);
        }

        Alert.alert("Verification required", message, [
          {
            text: "Go to Verification",
            onPress: () =>
              navigation.navigate("Verification", {
                verificationType: isSelfDrive ? "self_drive" : "with_driver",
              }),
          },
          {
            text: "View Bookings",
            onPress: () => navigation.navigate("Bookings"),
          },
        ]);
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
              {formatPeso(selectedVehicle?.dailyRate)}/day
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

      <Text style={styles.label}>Destination</Text>
      <View style={styles.inputWrap}>
        <Feather name="map-pin" size={18} color="#98A2B3" />
        <TextInput
          value={schedule.destination}
          onChangeText={(value) => updateSchedule("destination", value)}
          placeholder="e.g. Tagaytay, Batangas, Baguio"
          placeholderTextColor="#98A2B3"
          style={styles.input}
          returnKeyType="next"
        />
      </View>
      {!!errors.destination && <Text style={styles.errorText}>{errors.destination}</Text>}

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

      <Text style={styles.label}>Pickup Location</Text>
      <View style={styles.inputWrap}>
        <Feather name="navigation" size={18} color="#98A2B3" />
        <TextInput
          value={schedule.pickupLocation}
          onChangeText={(value) => updateSchedule("pickupLocation", value)}
          placeholder="Enter full pickup address"
          placeholderTextColor="#98A2B3"
          style={styles.input}
          multiline
        />
      </View>
      {!!errors.pickupLocation && <Text style={styles.errorText}>{errors.pickupLocation}</Text>}

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
              onPress={() => setPicker(key)}
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
          {selectedDays > 0 ? `${selectedDays} day(s) selected` : "Select valid date and time"}
        </Text>
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
          <TouchableOpacity style={styles.circleButton} onPress={() => updatePreference("passengers", Math.max(1, preferences.passengers - 1))}>
            <Text style={styles.circleButtonText}>-</Text>
          </TouchableOpacity>
          <View style={styles.counterTrack}>
            <View style={[styles.counterFill, { width: `${(preferences.passengers / 12) * 100}%` }]} />
          </View>
          <TouchableOpacity style={styles.circleButton} onPress={() => updatePreference("passengers", Math.min(12, preferences.passengers + 1))}>
            <Text style={styles.circleButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      <Text style={styles.label}>Luggage Bags</Text>
      <View style={styles.compactGrid}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
          <TouchableOpacity
            key={count}
            style={[styles.compactOption, preferences.luggageBags === count && styles.compactOptionActive]}
            onPress={() => updatePreference("luggageBags", count)}
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
          >
            <Text style={[styles.purposeText, preferences.tripPurpose === purpose && styles.purposeTextActive]}>
              {purpose}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {preferences.tripPurpose === "Other" && (
        <View style={styles.inputWrap}>
          <Feather name="edit-3" size={18} color="#98A2B3" />
          <TextInput
            value={preferences.customPurpose}
            onChangeText={(value) => updatePreference("customPurpose", value)}
            placeholder="Describe your Trip Purpose"
            placeholderTextColor="#98A2B3"
            style={styles.input}
          />
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
        <Text style={styles.vehicleRate}>{formatPeso(vehicle.dailyRate)}/day</Text>
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
          {formatPeso(selectedVehicle?.dailyRate)}/day
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
        <Text style={styles.summaryLabel}>Estimated Total</Text>
        <Text style={styles.summaryValue}>{formatPeso(totalPrice)}</Text>
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
      <Text style={styles.successTitle}>Booking request submitted</Text>
      <Text style={styles.successSubtitle}>
        Your booking is now pending FleetX review. Verification is reviewed before approval.
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
    ["Trip Type", getTripTypeLabel(tripType)],
    ["Pickup Location", schedule.pickupLocation],
    ["Destination", schedule.destination],
    ["Schedule", `${formatDate(schedule.startDate)} ${formatTime(schedule.startTime)} to ${formatDate(schedule.endDate)} ${formatTime(schedule.endTime)}`],
    ["Passengers", `${preferences.passengers}`],
    ["Luggage Bags", `${preferences.luggageBags}`],
    ["Transmission", preferences.transmission === "any" ? "Any" : preferences.transmission],
    ["Trip Purpose", purposeOfTravel || "Not set"],
    ["Estimated Total", formatPeso(totalPrice)],
    ["Verification", `${verificationLabel}. Verification is reviewed before approval.`],
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerContent}>
              <Text style={styles.headerEyebrow}>Premium booking flow</Text>
              <Text style={styles.header}>
                {isDirectBooking ? "Book Selected Vehicle" : "Plan My Trip"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("Home")}>
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
        </ScrollView>

        {!success && (
          <View style={styles.stickyFooter}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            {currentStep < 4 ? (
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() =>
                  isDirectBooking ? setReviewVisible(true) : setCurrentStep(3)
                }
              >
                <Text style={styles.primaryButtonText}>
                  {isDirectBooking ? "Review Booking" : "Edit Trip Details"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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

        <Modal visible={reviewVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.reviewModal}>
              <ScrollView
                showsVerticalScrollIndicator={false}
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
                      setCurrentStep(3);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Edit Trip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (submitLoading || !acceptedTerms) && styles.buttonDisabled,
                    ]}
                    onPress={submitBooking}
                    disabled={submitLoading || !acceptedTerms}
                  >
                    <Text style={styles.primaryButtonText}>
                      {submitLoading ? "Submitting..." : "Submit Booking"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setReviewVisible(false)}
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
