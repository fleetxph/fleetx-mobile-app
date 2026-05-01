import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { getDateRangeError } from "../utils/dateValidation";
import { getVehicleImageUrl } from "../utils/imageUrl";

export default function BookNow({ route, navigation }) {
  const { vehicle } = route.params;

  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const vehicleImageUrl = getVehicleImageUrl(vehicle);

  const resetForm = () => {
    setFullName("");
    setContact("");
    setEmail("");
    setStartDate("");
    setEndDate("");
  };

  const submit = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    const dateError = getDateRangeError({
      startDate: startDate.trim(),
      endDate: endDate.trim(),
    });
    if (dateError) {
      setErrorMsg(dateError.message);
      return;
    }

    try {
      setSubmitting(true);

      navigation.navigate("BookingWizard", {
        vehicle,
        vehicleId: vehicle?._id,
        selectedVehicle: vehicle,
        entryMode: "directVehicle",
        mode: "direct",
        tripData: {
          startDate: startDate.trim(),
          endDate: endDate.trim(),
        },
      });
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || "Failed to continue booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroSection}>
        <Text style={styles.heroLabel}>BOOKING DETAILS</Text>
        <Text style={styles.header}>
          Book {vehicle.make} {vehicle.model}
        </Text>
        <Text style={styles.subHeader}>
          Continue to the current protected booking flow for your selected vehicle.
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {successMsg ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{successMsg}</Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Back to Vehicles</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.vehicleCard}>
        {vehicleImageUrl && !imageFailed ? (
          <Image
            key={`${vehicle?._id || vehicle?.id || "vehicle"}-${vehicleImageUrl}`}
            source={{ uri: vehicleImageUrl }}
            style={styles.vehicleImage}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No Image Available</Text>
          </View>
        )}

        <View style={styles.vehicleInfo}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Selected Vehicle</Text>
            </View>
          </View>

          <Text style={styles.vehicleTitle}>
            {vehicle.make} {vehicle.model}
          </Text>

          <Text style={styles.vehicleSubtitle}>{vehicle.year} Model</Text>

          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Rate per day</Text>
            <Text style={styles.price}>
              ₱{vehicle.dailyRate ?? vehicle.pricePerDay ?? 0}/day
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Booking Handoff</Text>
        <Text style={styles.sectionSubtitle}>
          This screen now forwards you to the current booking wizard instead of the old public booking endpoint.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Juan Dela Cruz"
            placeholderTextColor="#8C8C8C"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="09xxxxxxxxx"
            placeholderTextColor="#8C8C8C"
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor="#8C8C8C"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Rental Schedule</Text>
        <Text style={styles.sectionSubtitle}>
          Enter your preferred pickup and return dates.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Pickup Date *</Text>
          <TextInput
            value={startDate}
            onChangeText={(value) => {
              setStartDate(value);
              setErrorMsg("");
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8C8C8C"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Dropoff Date *</Text>
          <TextInput
            value={endDate}
            onChangeText={(value) => {
              setEndDate(value);
              setErrorMsg("");
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8C8C8C"
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Continuing..." : "Continue Booking"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0B",
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 32,
  },
  heroSection: {
    marginBottom: 18,
  },
  heroLabel: {
    color: "#FF4D6D",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  header: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  subHeader: {
    color: "#A8A8A8",
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
  },
  errorBox: {
    backgroundColor: "#2A1215",
    borderColor: "#6E1E28",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: "#FF8C9D",
    fontSize: 14,
    fontWeight: "600",
  },
  successBox: {
    backgroundColor: "#11261A",
    borderColor: "#1F6A42",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  successText: {
    color: "#8CF0B5",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#1C1C1C",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  vehicleCard: {
    backgroundColor: "#141414",
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#222222",
  },
  vehicleImage: {
    width: "100%",
    height: 200,
  },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    color: "#9A9A9A",
    fontSize: 14,
  },
  vehicleInfo: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  badge: {
    backgroundColor: "rgba(255, 0, 92, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 92, 0.35)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    color: "#FF4D6D",
    fontSize: 12,
    fontWeight: "700",
  },
  vehicleTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  vehicleSubtitle: {
    color: "#A5A5A5",
    fontSize: 14,
    marginTop: 6,
  },
  priceBox: {
    marginTop: 16,
    backgroundColor: "#1B1B1B",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#252525",
  },
  priceLabel: {
    color: "#9A9A9A",
    fontSize: 13,
    marginBottom: 4,
  },
  price: {
    color: "#FF4D6D",
    fontSize: 22,
    fontWeight: "800",
  },
  formCard: {
    backgroundColor: "#141414",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#222222",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "#9E9E9E",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    color: "#D6D6D6",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1C1C1C",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 15,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  divider: {
    height: 1,
    backgroundColor: "#242424",
    marginVertical: 18,
  },
  button: {
    marginTop: 10,
    backgroundColor: "#FF005C",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF005C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
});
