import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
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

function createLocationState(
  location,
  fallbackLabel,
  defaultRegion,
  fallbackSource = "manual",
  { useFallbackCoordinates = true } = {}
) {
  const resolvedLabel = getBestLocationLabel(location, fallbackLabel);
  const latitudeValue = Number(location?.latitude);
  const longitudeValue = Number(location?.longitude);
  const hasExplicitCoordinates =
    Number.isFinite(latitudeValue) && Number.isFinite(longitudeValue);

  return {
    label: resolvedLabel,
    address: resolvedLabel,
    latitude: hasExplicitCoordinates
      ? latitudeValue
      : useFallbackCoordinates
      ? Number(defaultRegion.latitude)
      : null,
    longitude: hasExplicitCoordinates
      ? longitudeValue
      : useFallbackCoordinates
      ? Number(defaultRegion.longitude)
      : null,
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

function hasConfiguredNativeGoogleMapsKey() {
  const expoConfig = Constants.expoConfig || Constants.manifest2?.extra?.expoClient || {};
  const configKey = String(
    expoConfig?.android?.config?.googleMaps?.apiKey ||
      ""
  ).trim();
  const booleanFlag = expoConfig?.extra?.hasNativeGoogleMapsKey === true;
  return Boolean(configKey || booleanFlag);
}

export default function LocationPickerModal({
  visible,
  mode = "destination",
  initialLocation,
  resolvedLocation,
  initialLabel,
  statusMessage = "",
  errorMessage = "",
  isLoading = false,
  onClose,
  onConfirm,
}) {
  const mapRef = useRef(null);
  const selectedLocationRef = useRef(null);
  const reverseLookupIdRef = useRef(0);
  const reverseLookupTimerRef = useRef(null);
  const initialReverseLookupTimerRef = useRef(null);
  const currentRegionRef = useRef(null);
  const title = mode === "pickup" ? "Pin Pickup Location" : "Pin Destination";
  const placeholderLabel = "Selected map location";
  const canReverseGeocode = hasGooglePlacesApiKey();
  const nativeGoogleMapsConfigured = hasConfiguredNativeGoogleMapsKey();
  const activeLocation = resolvedLocation || initialLocation || null;
  const defaultRegion = useMemo(() => getRegionFromLocation(activeLocation, mode), [activeLocation, mode]);
  const canRenderMap =
    Platform.OS !== "android" || __DEV__ || nativeGoogleMapsConfigured;
  const [selectedLocation, setSelectedLocation] = useState(() =>
    createLocationState(
      activeLocation,
      initialLabel,
      defaultRegion,
      resolvedLocation ? "geocoded" : "manual",
      { useFallbackCoordinates: canRenderMap }
    )
  );
  const [localStatusMessage, setLocalStatusMessage] = useState(statusMessage);
  const [localErrorMessage, setLocalErrorMessage] = useState(errorMessage);
  const [isMapInteracting, setIsMapInteracting] = useState(false);

  useEffect(() => {
    selectedLocationRef.current = selectedLocation;
  }, [selectedLocation]);

  useEffect(() => {
    const nextLocation = createLocationState(
      activeLocation,
      initialLabel,
      defaultRegion,
      resolvedLocation ? "geocoded" : "manual",
      { useFallbackCoordinates: canRenderMap }
    );

    setSelectedLocation(nextLocation);
    currentRegionRef.current = defaultRegion;
    setLocalStatusMessage(statusMessage);
    setLocalErrorMessage(
      errorMessage ||
        (canReverseGeocode ? "" : GOOGLE_PLACES_CONFIG_MESSAGE)
    );
  }, [activeLocation, canRenderMap, canReverseGeocode, defaultRegion.latitude, defaultRegion.longitude, errorMessage, initialLabel, resolvedLocation, statusMessage]);

  useEffect(() => {
    if (!canRenderMap) return;
    if (!visible || !mapRef.current) return;
    mapRef.current.animateToRegion(defaultRegion, 250);
  }, [canRenderMap, defaultRegion, visible]);

  useEffect(() => {
    if (!visible) return undefined;

    if (initialReverseLookupTimerRef.current) {
      clearTimeout(initialReverseLookupTimerRef.current);
      initialReverseLookupTimerRef.current = null;
    }

    const hasCoordinates =
      Number.isFinite(Number(selectedLocation.latitude)) &&
      Number.isFinite(Number(selectedLocation.longitude));
    const shouldResolveLabel =
      hasCoordinates && (!selectedLocation.address || isGenericLocationLabel(selectedLocation.address));

    if (shouldResolveLabel && canReverseGeocode) {
      initialReverseLookupTimerRef.current = setTimeout(() => {
        resolvePinAddress(selectedLocation.latitude, selectedLocation.longitude);
      }, 220);
    }

    return () => {
      if (initialReverseLookupTimerRef.current) {
        clearTimeout(initialReverseLookupTimerRef.current);
        initialReverseLookupTimerRef.current = null;
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
    reverseLookupIdRef.current += 1;
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
    if (initialReverseLookupTimerRef.current) {
      clearTimeout(initialReverseLookupTimerRef.current);
      initialReverseLookupTimerRef.current = null;
    }
    if (reverseLookupTimerRef.current) {
      clearTimeout(reverseLookupTimerRef.current);
    }
    reverseLookupTimerRef.current = setTimeout(() => {
      resolvePinAddress(latitude, longitude);
    }, 220);
  };

  const handleRegionChangeComplete = (region = {}) => {
    const latitude = Number(region.latitude);
    const longitude = Number(region.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    currentRegionRef.current = region;
    setIsMapInteracting(false);

    const currentLocation = selectedLocationRef.current;
    const latitudeUnchanged =
      Math.abs(Number(currentLocation?.latitude) - latitude) < 0.0000001;
    const longitudeUnchanged =
      Math.abs(Number(currentLocation?.longitude) - longitude) < 0.0000001;

    if (latitudeUnchanged && longitudeUnchanged) return;
    updatePinPosition({ latitude, longitude });
  };

  const handleMapPress = ({ latitude, longitude }) => {
    const currentRegion = currentRegionRef.current || defaultRegion;
    mapRef.current?.animateToRegion(
      {
        ...currentRegion,
        latitude,
        longitude,
      },
      220
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            scrollEnabled={!isMapInteracting}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              Move the map until the pin is over the exact location.
            </Text>

            <View style={styles.mapPreviewCard}>
              <View style={styles.mapGrid}>
                {isLoading ? (
                  <View style={styles.mapState}>
                    <ActivityIndicator size="small" color="#F47C20" />
                    <Text style={styles.mapStateText}>Preparing map...</Text>
                  </View>
                ) : canRenderMap ? (
                  <>
                    <MapView
                      ref={mapRef}
                      style={styles.map}
                      initialRegion={defaultRegion}
                      onPress={(event) => handleMapPress(event.nativeEvent.coordinate)}
                      onRegionChangeComplete={handleRegionChangeComplete}
                      onTouchStart={() => setIsMapInteracting(true)}
                      onTouchEnd={() => setIsMapInteracting(false)}
                      onTouchCancel={() => setIsMapInteracting(false)}
                    />
                    <View pointerEvents="none" style={styles.centerPinOverlay}>
                      <View style={styles.centerPinShadow} />
                      <Ionicons
                        name="location"
                        size={46}
                        color="#F47C20"
                        style={styles.centerPinIcon}
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.mapState}>
                    <Ionicons name="map-outline" size={24} color="#F47C20" />
                    <Text style={styles.mapStateText}>
                      Map pinning is unavailable in this Android build right now.
                    </Text>
                    <Text style={styles.mapStateSubtext}>
                      You can continue using the manual pickup or destination address field.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {(localStatusMessage || "Move the map to position the pin.") ? (
              <View style={styles.helperCard}>
                <Ionicons name="information-circle-outline" size={18} color="#F47C20" />
                <Text style={styles.helperText}>
                  {localStatusMessage || "Move the map to position the pin."}
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
