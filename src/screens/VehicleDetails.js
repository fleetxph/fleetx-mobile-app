import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { styles } from "../styles/vehicleDetailsStyle";
import { getDateRangeError } from "../utils/dateValidation";
import { getVehicleImageGallery } from "../utils/imageUrl";

export default function VehicleDetails({ route, navigation }) {
  const { vehicle, tripData } = route.params || {};

  const [showPickup, setShowPickup] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  const [pickupDate, setPickupDate] = useState(
    tripData?.startDate ? new Date(`${tripData.startDate}T00:00:00`) : null
  );
  const [returnDate, setReturnDate] = useState(
    tripData?.endDate ? new Date(`${tripData.endDate}T00:00:00`) : null
  );

  const [errorMsg, setErrorMsg] = useState("");
  const [failedImages, setFailedImages] = useState({});
  const galleryImages = useMemo(() => getVehicleImageGallery(vehicle), [vehicle]);
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    setActiveImage(galleryImages[0] || null);
    setFailedImages({});
  }, [vehicle?._id, vehicle?.id, galleryImages]);

  const toMidnight = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const days = useMemo(() => {
    if (!pickupDate || !returnDate) return 0;

    const start = toMidnight(pickupDate);
    const end = toMidnight(returnDate);
    const diff = (end - start) / (1000 * 60 * 60 * 24);

    if (diff < 0) return 0;
    return Math.floor(diff) + 1;
  }, [pickupDate, returnDate]);

  const total = days * Number(vehicle?.dailyRate || 0);
  const downPayment = total * 0.5;
  const balance = total - downPayment;

  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date) => {
    return date ? new Date(date).toDateString() : "";
  };

  const handleWebDateChange = (value, type) => {
    if (!value) return;

    const selected = new Date(`${value}T00:00:00`);
    setErrorMsg("");

    if (type === "pickup") {
      setPickupDate(selected);

      if (returnDate && new Date(returnDate) < selected) {
        setReturnDate(null);
      }
    } else {
      const dateError = getDateRangeError({ startDate: pickupDate, endDate: selected });
      if (dateError) {
        setErrorMsg(dateError.message);
      }
      setReturnDate(selected);
    }
  };

  const handleContinueBooking = () => {
    setErrorMsg("");

    const dateError = getDateRangeError({ startDate: pickupDate, endDate: returnDate });
    if (dateError) {
      setErrorMsg(dateError.message);
      return;
    }

    navigation.navigate("BookingWizard", {
      vehicle,
      vehicleId: vehicle?._id,
      selectedVehicle: vehicle,
      entryMode: "directVehicle",
      mode: "direct",
      pickupDate: pickupDate.toISOString(),
      returnDate: returnDate.toISOString(),
      tripData: tripData || null,
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
          <Text style={styles.rateValue}>₱{vehicle?.dailyRate || 0}/day</Text>
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

        {!!errorMsg && (
          <Text style={{ color: "#DC2626", marginBottom: 12, fontWeight: "600" }}>
            {errorMsg}
          </Text>
        )}

        <Text style={styles.label}>Pickup Date</Text>
        {Platform.OS === "web" ? (
          <input
            type="date"
            value={formatDateForInput(pickupDate)}
            min={formatDateForInput(new Date())}
            onChange={(e) => handleWebDateChange(e.target.value, "pickup")}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid #DCE7F5",
              background: "#F8FBFF",
              color: "#0F172A",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "12px",
            }}
          />
        ) : (
          <TouchableOpacity
            onPress={() => setShowPickup(true)}
            style={styles.inputBox}
          >
            <Text style={styles.inputText}>
              {pickupDate ? formatDateForDisplay(pickupDate) : "Select pickup date"}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Return Date</Text>
        {Platform.OS === "web" ? (
          <input
            type="date"
            value={formatDateForInput(returnDate)}
            min={formatDateForInput(pickupDate || new Date())}
            onChange={(e) => handleWebDateChange(e.target.value, "return")}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid #DCE7F5",
              background: "#F8FBFF",
              color: "#0F172A",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "12px",
            }}
          />
        ) : (
          <TouchableOpacity
            onPress={() => setShowReturn(true)}
            style={styles.inputBox}
          >
            <Text style={styles.inputText}>
              {returnDate ? formatDateForDisplay(returnDate) : "Select return date"}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pickup Date</Text>
            <Text style={styles.summaryValue}>
              {pickupDate ? formatDateForDisplay(pickupDate) : "Not set"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Return Date</Text>
            <Text style={styles.summaryValue}>
              {returnDate ? formatDateForDisplay(returnDate) : "Not set"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rental Length</Text>
            <Text style={styles.summaryValue}>
              {days > 0 ? `${days} day${days > 1 ? "s" : ""}` : "Not set"}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Rental Fee</Text>
            <Text style={styles.summaryValue}>₱{total || 0}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Required Down Payment</Text>
            <Text style={styles.summaryValue}>₱{downPayment || 0}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remaining Balance</Text>
            <Text style={styles.summaryValue}>₱{balance || 0}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleContinueBooking}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Continue Booking</Text>
      </TouchableOpacity>

      {Platform.OS !== "web" && showPickup && (
        <DateTimePicker
          value={pickupDate || new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowPickup(false);
            if (date) {
              setErrorMsg("");
              setPickupDate(date);
              if (returnDate && new Date(returnDate) < date) {
                setReturnDate(null);
              }
            }
          }}
        />
      )}

      {Platform.OS !== "web" && showReturn && (
        <DateTimePicker
          value={returnDate || pickupDate || new Date()}
          mode="date"
          minimumDate={pickupDate || new Date()}
          onChange={(event, date) => {
            setShowReturn(false);
            if (date) {
              const dateError = getDateRangeError({ startDate: pickupDate, endDate: date });
              setErrorMsg(dateError?.message || "");
              setReturnDate(date);
            }
          }}
        />
      )}
    </ScrollView>
  );
} 
