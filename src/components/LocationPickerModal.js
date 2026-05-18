import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import {
  GOOGLE_PLACES_CONFIG_MESSAGE,
  hasGooglePlacesApiKey,
  reverseGeocode,
} from "../api/publicApi";
import { styles } from "../styles/locationPickerModalStyle";

const DEFAULT_REGIONS = {
  destination: {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
  pickup: {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
};

function normalizeLabelText(value) {
  return String(value || "").trim();
}

function isGenericLocationLabel(value) {
  const normalized = normalizeLabelText(value).toLowerCase();
  return (
    !normalized ||
    normalized === "pinned destination" ||
    normalized === "pinned pickup location" ||
    normalized === "pinned location" ||
    normalized === "selected map location" ||
    normalized === "pinned location selected"
  );
}

function getBestLocationLabel(location, fallbackLabel = "") {
  const candidates = [
    location?.formattedAddress,
    location?.address,
    location?.label,
    fallbackLabel,
  ];

  for (const candidate of candidates) {
    const value = normalizeLabelText(candidate);
    if (value && !isGenericLocationLabel(value)) {
      return value;
    }
  }

  return normalizeLabelText(fallbackLabel || location?.address || location?.label || "");
}

function createLocationState(location, fallbackLabel, defaultRegion, fallbackSource = "manual") {
  const resolvedLabel = getBestLocationLabel(location, fallbackLabel);

  return {
    label: resolvedLabel,
    address: resolvedLabel,
    latitude: Number(location?.latitude ?? defaultRegion.latitude),
    longitude: Number(location?.longitude ?? defaultRegion.longitude),
    placeId: String(location?.placeId || "").trim(),
    source: location?.source || fallbackSource,
  };
}

function getRegionFromLocation(location, mode) {
  const fallback = DEFAULT_REGIONS[mode] || DEFAULT_REGIONS.destination;
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return fallback;
  }

  return {
    latitude,
    longitude,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };
}

function formatCoordinate(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(4) : fallback;
}

export default function LocationPickerModal({
  visible,
  mode = "destination",
  initialLocation,
  resolvedLocation,
  initialLabel,
  statusMessage = "",
  errorMessage = "",
  onClose,
  onConfirm,
}) {
  const mapRef = useRef(null);
  const selectedLocationRef = useRef(null);
  const reverseLookupIdRef = useRef(0);
  const reverseLookupTimerRef = useRef(null);
  const title = mode === "pickup" ? "Pin Pickup Location" : "Pin Destination";
  const placeholderLabel = "Selected map location";
  const canReverseGeocode = hasGooglePlacesApiKey();
  const activeLocation = resolvedLocation || initialLocation || null;
  const defaultRegion = useMemo(() => getRegionFromLocation(activeLocation, mode), [activeLocation, mode]);
  const [selectedLocation, setSelectedLocation] = useState(() =>
    createLocationState(
      activeLocation,
      initialLabel,
      defaultRegion,
      resolvedLocation ? "geocoded" : "manual"
    )
  );
  const [localStatusMessage, setLocalStatusMessage] = useState(statusMessage);
  const [localErrorMessage, setLocalErrorMessage] = useState(errorMessage);

  useEffect(() => {
    selectedLocationRef.current = selectedLocation;
  }, [selectedLocation]);

  useEffect(() => {
    const nextLocation = createLocationState(
      activeLocation,
      initialLabel,
      defaultRegion,
      resolvedLocation ? "geocoded" : "manual"
    );

    setSelectedLocation(nextLocation);
    setLocalStatusMessage(statusMessage);
    setLocalErrorMessage(
      errorMessage ||
        (canReverseGeocode ? "" : GOOGLE_PLACES_CONFIG_MESSAGE)
    );
  }, [activeLocation, canReverseGeocode, defaultRegion.latitude, defaultRegion.longitude, errorMessage, initialLabel, resolvedLocation, statusMessage]);

  useEffect(() => {
    if (!visible || !mapRef.current) return;
    mapRef.current.animateToRegion(getRegionFromLocation(selectedLocation, mode), 250);
  }, [mode, selectedLocation, visible]);

  useEffect(() => {
    if (!visible) return undefined;

    if (reverseLookupTimerRef.current) {
      clearTimeout(reverseLookupTimerRef.current);
      reverseLookupTimerRef.current = null;
    }

    const hasCoordinates =
      Number.isFinite(Number(selectedLocation.latitude)) &&
      Number.isFinite(Number(selectedLocation.longitude));
    const shouldResolveLabel =
      hasCoordinates && (!selectedLocation.address || isGenericLocationLabel(selectedLocation.address));

    if (shouldResolveLabel && canReverseGeocode) {
      reverseLookupTimerRef.current = setTimeout(() => {
        resolvePinAddress(selectedLocation.latitude, selectedLocation.longitude);
      }, 220);
    }

    return () => {
      if (reverseLookupTimerRef.current) {
        clearTimeout(reverseLookupTimerRef.current);
        reverseLookupTimerRef.current = null;
      }
    };
  }, [canReverseGeocode, selectedLocation.address, selectedLocation.latitude, selectedLocation.longitude, visible]);

  const resolvePinAddress = async (latitude, longitude) => {
    const currentSelection = selectedLocationRef.current || selectedLocation;
    const coordinateFallback = `Pinned location (${formatCoordinate(latitude, "0.0000")}, ${formatCoordinate(longitude, "0.0000")})`;
    const fallbackResolvedLabel =
      getBestLocationLabel(currentSelection, initialLabel || placeholderLabel) ||
      coordinateFallback;

    if (!canReverseGeocode) {
      setSelectedLocation((prev) => ({
        ...prev,
        label: getBestLocationLabel(prev, fallbackResolvedLabel) || coordinateFallback,
        address: getBestLocationLabel(prev, fallbackResolvedLabel) || coordinateFallback,
      }));
      return;
    }

    const requestId = reverseLookupIdRef.current + 1;
    reverseLookupIdRef.current = requestId;
    setLocalStatusMessage("Finding address...");
    setLocalErrorMessage("");

    try {
      const result = await reverseGeocode(latitude, longitude);
      if (reverseLookupIdRef.current !== requestId) return;

      if (result?.formattedAddress) {
        setSelectedLocation((prev) => ({
          ...prev,
          label: result.formattedAddress,
          address: result.formattedAddress,
          placeId: result.placeId || prev.placeId || "",
          source: "pin",
        }));
        setLocalStatusMessage("Pinned location updated.");
      } else {
        setSelectedLocation((prev) => ({
          ...prev,
          label: getBestLocationLabel(prev, fallbackResolvedLabel) || coordinateFallback,
          address: getBestLocationLabel(prev, fallbackResolvedLabel) || coordinateFallback,
          source: "pin",
        }));
        setLocalStatusMessage("");
      }
    } catch {
      if (reverseLookupIdRef.current !== requestId) return;
      setSelectedLocation((prev) => ({
        ...prev,
        label: getBestLocationLabel(prev, fallbackResolvedLabel) || coordinateFallback,
        address: getBestLocationLabel(prev, fallbackResolvedLabel) || coordinateFallback,
        source: "pin",
      }));
      setLocalStatusMessage("");
      setLocalErrorMessage("We could not resolve the pinned address. You can still use this location.");
    }
  };

  const updatePinPosition = ({ latitude, longitude }) => {
    const coordinateFallback = `Pinned location (${formatCoordinate(latitude, "0.0000")}, ${formatCoordinate(longitude, "0.0000")})`;
    setSelectedLocation((prev) => ({
      ...prev,
      latitude,
      longitude,
      label: getBestLocationLabel(prev, prev.address || prev.label) || coordinateFallback,
      address: getBestLocationLabel(prev, prev.address || prev.label) || coordinateFallback,
      source: "pin",
    }));
    setLocalStatusMessage("Finding address...");
    setLocalErrorMessage("");
    if (reverseLookupTimerRef.current) {
      clearTimeout(reverseLookupTimerRef.current);
    }
    reverseLookupTimerRef.current = setTimeout(() => {
      resolvePinAddress(latitude, longitude);
    }, 220);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              Tap the map or drag the marker to confirm the exact location.
            </Text>

            <View style={styles.mapPreviewCard}>
              <View style={styles.mapGrid}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={defaultRegion}
                  onPress={(event) => updatePinPosition(event.nativeEvent.coordinate)}
                >
                  <Marker
                    coordinate={{
                      latitude: Number(selectedLocation.latitude || defaultRegion.latitude),
                      longitude: Number(selectedLocation.longitude || defaultRegion.longitude),
                    }}
                    draggable
                    onDragEnd={(event) => updatePinPosition(event.nativeEvent.coordinate)}
                  />
                </MapView>
              </View>
            </View>

            {(localStatusMessage || "Tap the map or drag the pin to update the location.") ? (
              <View style={styles.helperCard}>
                <Ionicons name="information-circle-outline" size={18} color="#F47C20" />
                <Text style={styles.helperText}>
                  {localStatusMessage || "Tap the map or drag the pin to update the location."}
                </Text>
              </View>
            ) : null}

            {localErrorMessage ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={styles.errorText}>{localErrorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Selected coordinates</Text>
              <Text style={styles.previewValue}>
                {formatCoordinate(selectedLocation.latitude, "14.5995")},{" "}
                {formatCoordinate(selectedLocation.longitude, "120.9842")}
              </Text>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Location label</Text>
              <TextInput
                value={selectedLocation.address || selectedLocation.label}
                editable
                onChangeText={(value) =>
                  setSelectedLocation((prev) => ({
                    ...prev,
                    label: value,
                    address: value,
                  }))
                }
                placeholder={placeholderLabel}
                placeholderTextColor="#98A2B3"
                style={styles.labelInput}
              />
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.9}
                onPress={() =>
                  onConfirm?.({
                    label:
                      getBestLocationLabel(selectedLocation, initialLabel || placeholderLabel) ||
                      placeholderLabel,
                    address:
                      getBestLocationLabel(selectedLocation, initialLabel || placeholderLabel) ||
                      placeholderLabel,
                    latitude: Number.isFinite(Number(selectedLocation.latitude))
                      ? Number(selectedLocation.latitude)
                      : null,
                    longitude: Number.isFinite(Number(selectedLocation.longitude))
                      ? Number(selectedLocation.longitude)
                      : null,
                    placeId: selectedLocation.placeId || "",
                    source: selectedLocation.source || "pin",
                  })
                }
              >
                <Text style={styles.primaryButtonText}>Use This Location</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
