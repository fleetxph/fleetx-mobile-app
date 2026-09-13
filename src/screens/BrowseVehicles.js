import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, Ionicons } from "@expo/vector-icons";
import { getFriendlyApiErrorMessage } from "../api/api";
import { getVehicles } from "../api/clientApi";
import { styles } from "../styles/browseVehiclesStyle";
import { getVehicleImageUrl } from "../utils/imageUrl";
import { formatLuggageSummary, getVehicleLuggageFit } from "../utils/luggageFit";
import { formatVehicleDailyRateLabel, getVehicleDailyRate } from "../utils/vehicleRate";

const PAGE_SIZE = 10;
const VEHICLE_TYPE_OPTIONS = ["All Types", "Sedan", "SUV", "Van", "Pickup", "MPV"];
const PRICE_RANGE_OPTIONS = [
  "All",
  "Under PHP 2,000",
  "PHP 2,000 - PHP 4,000",
  "PHP 4,000+",
];
const SEAT_OPTIONS = ["All", "2-4", "5-7", "8-12+"];
const TRANSMISSION_OPTIONS = ["All", "Automatic", "Manual"];
const FUEL_TYPE_OPTIONS = ["All", "Gasoline", "Diesel", "Hybrid", "Electric"];
const FEATURE_OPTIONS = [
  "Air Conditioning",
  "Bluetooth",
  "USB Port",
  "Reverse Camera",
  "Parking Sensors",
];
const SORT_OPTIONS = [
  "Recommended",
  "Price: Low to High",
  "Price: High to Low",
  "Seats: Low to High",
  "Seats: High to Low",
];
const VEHICLE_CACHE_KEY = "fleetx_public_vehicles_cache_v1";

function getVehicleKey(vehicle, index = 0) {
  return String(
    vehicle?._id ||
      vehicle?.id ||
      vehicle?.plateNo ||
      `${vehicle?.make || "vehicle"}-${vehicle?.model || ""}-${vehicle?.year || index}`
  );
}

function mergeUniqueVehicles(current, incoming) {
  const vehiclesById = new Map();
  [...current, ...incoming].forEach((vehicle, index) => {
    vehiclesById.set(getVehicleKey(vehicle, index), vehicle);
  });
  return Array.from(vehiclesById.values());
}

const createDefaultFilters = (vehicleType = "All Types") => ({
  vehicleType,
  priceRange: "All",
  seats: "All",
  transmission: "All",
  fuelType: "All",
  features: [],
});

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getSeatCount(vehicle) {
  const rawSeats = Number(vehicle?.seater ?? vehicle?.seats ?? 0);
  return Number.isFinite(rawSeats) ? rawSeats : 0;
}

function hasBudgetPreference(value) {
  return value !== null && value !== undefined && value !== "" && Number(value) > 0;
}

function hasVehicleFeature(vehicle, feature) {
  const normalizedFeature = normalizeText(feature);
  const description = normalizeText(vehicle?.description);
  const features = Array.isArray(vehicle?.features)
    ? vehicle.features.map((item) => normalizeText(item))
    : [];

  const includesFeatureText = (terms) =>
    terms.some((term) => description.includes(term) || features.some((item) => item.includes(term)));

  if (normalizedFeature === "air conditioning") {
    return Boolean(vehicle?.aircon) || includesFeatureText(["aircon", "air conditioning", "a/c"]);
  }

  if (normalizedFeature === "bluetooth") {
    return Boolean(vehicle?.bluetooth) || includesFeatureText(["bluetooth"]);
  }

  if (normalizedFeature === "usb port") {
    return Boolean(vehicle?.usbPort) || includesFeatureText(["usb", "usb port"]);
  }

  if (normalizedFeature === "reverse camera") {
    return Boolean(vehicle?.reverseCamera) || includesFeatureText(["reverse camera", "backup camera"]);
  }

  if (normalizedFeature === "parking sensors") {
    return Boolean(vehicle?.parkingSensors) || includesFeatureText(["parking sensor", "parking sensors"]);
  }

  return false;
}

export default function BrowseVehicles({ navigation, route }) {
  const tripData = route?.params?.tripData || null;
  const selectedCategoryFromRoute = route?.params?.selectedCategory || "All Types";
  const normalizedRouteCategory = VEHICLE_TYPE_OPTIONS.find(
    (item) => normalizeText(item) === normalizeText(selectedCategoryFromRoute)
  );

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [loadingNextPage, setLoadingNextPage] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");
  const [nextPageMessage, setNextPageMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("Recommended");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState(
    createDefaultFilters(normalizedRouteCategory || "All Types")
  );
  const [draftFilters, setDraftFilters] = useState(
    createDefaultFilters(normalizedRouteCategory || "All Types")
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [failedImages, setFailedImages] = useState({});
  const requestGenerationRef = useRef(0);
  const loadingNextPageRef = useRef(false);
  const serverParams = useMemo(() => {
    const params = {
      startDate: tripData?.startDate,
      endDate: tripData?.endDate,
      search: debouncedSearchQuery.trim() || undefined,
      category: filters.vehicleType !== "All Types" ? filters.vehicleType : undefined,
      transmission:
        filters.transmission !== "All"
          ? filters.transmission
          : tripData?.transmission && tripData.transmission !== "any"
          ? tripData.transmission
          : undefined,
      fuel: filters.fuelType !== "All" ? filters.fuelType : undefined,
    };

    if (filters.priceRange === "Under PHP 2,000") {
      params.maxPrice = 1999.99;
    } else if (filters.priceRange === "PHP 2,000 - PHP 4,000") {
      params.minPrice = 2000;
      params.maxPrice = 4000;
    } else if (filters.priceRange === "PHP 4,000+") {
      params.minPrice = 4000.01;
    }

    if (hasBudgetPreference(tripData?.budget)) {
      params.maxPrice = Math.min(
        Number(params.maxPrice ?? Number.POSITIVE_INFINITY),
        Number(tripData.budget)
      );
    }

    if (sortOption === "Price: Low to High") params.sort = "price-asc";
    if (sortOption === "Price: High to Low") params.sort = "price-desc";
    if (sortOption === "Seats: Low to High") params.sort = "capacity-asc";
    if (sortOption === "Seats: High to Low") params.sort = "capacity-desc";

    return params;
  }, [
    debouncedSearchQuery,
    filters.fuelType,
    filters.priceRange,
    filters.transmission,
    filters.vehicleType,
    sortOption,
    tripData?.budget,
    tripData?.endDate,
    tripData?.startDate,
    tripData?.transmission,
  ]);
  const serverRequestKey = JSON.stringify(serverParams);
  const vehicleCacheKey = `${VEHICLE_CACHE_KEY}:${serverRequestKey}`;

  const loadVehiclesPage = async (page, { reset = false, generation } = {}) => {
    if (!reset && loadingNextPageRef.current) return;

    if (reset) {
      loadingNextPageRef.current = false;
      setLoadingNextPage(false);
      setVehiclesLoading(true);
      setLoadMessage("");
      setNextPageMessage("");
    } else {
      loadingNextPageRef.current = true;
      setLoadingNextPage(true);
      setNextPageMessage("");
    }

    try {
      if (reset) {
        const cachedVehicles = await AsyncStorage.getItem(vehicleCacheKey);
        if (cachedVehicles) {
          const parsed = JSON.parse(cachedVehicles);
          if (Array.isArray(parsed) && parsed.length) {
            setVehicles(parsed);
          }
        }
      }

      const res = await getVehicles({
        ...serverParams,
        page,
        limit: PAGE_SIZE,
      });
      if (generation !== requestGenerationRef.current) return;

      const nextVehicles = Array.isArray(res?.vehicles)
        ? res.vehicles
        : Array.isArray(res)
        ? res
        : [];
      const responsePage = Number(res?.pagination?.page || page);
      const responseTotalPages = Number(
        res?.pagination?.totalPages ||
          (nextVehicles.length < PAGE_SIZE ? responsePage : responsePage + 1)
      );

      setVehicles((current) =>
        reset ? mergeUniqueVehicles([], nextVehicles) : mergeUniqueVehicles(current, nextVehicles)
      );
      setCurrentPage(responsePage);
      setTotalPages(Math.max(responsePage, responseTotalPages));

      if (reset) {
        await AsyncStorage.setItem(vehicleCacheKey, JSON.stringify(nextVehicles));
      }
    } catch (err) {
      console.log("Load vehicles error:", err?.response?.data || err.message);
      if (generation !== requestGenerationRef.current) return;

      const message = getFriendlyApiErrorMessage(
        err,
        reset
          ? "Could not load vehicles right now. Please try again."
          : "Could not load more vehicles. Tap to try again."
      );
      if (reset) setLoadMessage(message);
      else setNextPageMessage(message);
    } finally {
      if (generation === requestGenerationRef.current) {
        if (reset) setVehiclesLoading(false);
        else {
          loadingNextPageRef.current = false;
          setLoadingNextPage(false);
        }
      }
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    loadingNextPageRef.current = false;
    setVehicles([]);
    setCurrentPage(0);
    setTotalPages(1);
    loadVehiclesPage(1, { reset: true, generation });
  }, [serverRequestKey]);

  useEffect(() => {
    if (route?.params?.selectedCategory) {
      const nextCategory =
        VEHICLE_TYPE_OPTIONS.find(
          (item) => normalizeText(item) === normalizeText(route.params.selectedCategory)
        ) || "All Types";

      setFilters((prev) => ({ ...prev, vehicleType: nextCategory }));
      setDraftFilters((prev) => ({ ...prev, vehicleType: nextCategory }));
    }
  }, [route?.params?.selectedCategory]);

  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];
    const searchValue = normalizeText(searchQuery);

    if (searchValue) {
      result = result.filter((vehicle) => {
        const searchableFields = [
          vehicle?.make,
          vehicle?.model,
          vehicle?.category,
          vehicle?.plateNo,
          vehicle?.description,
        ]
          .map((value) => normalizeText(value))
          .filter(Boolean);

        return searchableFields.some((value) => value.includes(searchValue));
      });
    }

    if (filters.vehicleType !== "All Types") {
      result = result.filter(
        (vehicle) =>
          normalizeText(vehicle.category) === normalizeText(filters.vehicleType)
      );
    }

    if (filters.priceRange !== "All") {
      result = result.filter((vehicle) => {
        const rate = getVehicleDailyRate(vehicle) || 0;

        if (filters.priceRange === "Under PHP 2,000") return rate > 0 && rate < 2000;
        if (filters.priceRange === "PHP 2,000 - PHP 4,000") return rate >= 2000 && rate <= 4000;
        if (filters.priceRange === "PHP 4,000+") return rate > 4000;
        return true;
      });
    }

    if (filters.seats !== "All") {
      result = result.filter((vehicle) => {
        const seats = getSeatCount(vehicle);

        if (filters.seats === "2-4") return seats >= 2 && seats <= 4;
        if (filters.seats === "5-7") return seats >= 5 && seats <= 7;
        if (filters.seats === "8-12+") return seats >= 8;
        return true;
      });
    }

    if (filters.transmission !== "All") {
      result = result.filter(
        (vehicle) =>
          normalizeText(vehicle.transmission) === normalizeText(filters.transmission)
      );
    }

    if (filters.fuelType !== "All") {
      result = result.filter(
        (vehicle) => normalizeText(vehicle.fuel) === normalizeText(filters.fuelType)
      );
    }

    if (filters.features.length) {
      result = result.filter((vehicle) =>
        filters.features.every((feature) => hasVehicleFeature(vehicle, feature))
      );
    }

    if (tripData) {
      if (tripData.passengers) {
        result = result.filter(
          (vehicle) => Number(vehicle.seater || 0) >= Number(tripData.passengers)
        );
      }

      if (hasBudgetPreference(tripData.budget)) {
        result = result.filter(
          (vehicle) => {
            const rate = getVehicleDailyRate(vehicle);
            return rate !== null && rate <= Number(tripData.budget);
          }
        );
      }

      if (tripData.transmission && tripData.transmission !== "any") {
        result = result.filter(
          (vehicle) =>
            String(vehicle.transmission || "").toLowerCase() ===
            String(tripData.transmission).toLowerCase()
        );
      }
    }

    if (sortOption === "Price: Low to High") {
      result.sort((a, b) => Number(getVehicleDailyRate(a) || 0) - Number(getVehicleDailyRate(b) || 0));
    } else if (sortOption === "Price: High to Low") {
      result.sort((a, b) => Number(getVehicleDailyRate(b) || 0) - Number(getVehicleDailyRate(a) || 0));
    } else if (sortOption === "Seats: Low to High") {
      result.sort((a, b) => getSeatCount(a) - getSeatCount(b));
    } else if (sortOption === "Seats: High to Low") {
      result.sort((a, b) => getSeatCount(b) - getSeatCount(a));
    }

    return result;
  }, [filters, searchQuery, sortOption, tripData, vehicles]);

  const hasMoreVehicles = currentPage < totalPages;
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    filters.vehicleType !== "All Types" ||
    filters.priceRange !== "All" ||
    filters.seats !== "All" ||
    filters.transmission !== "All" ||
    filters.fuelType !== "All" ||
    filters.features.length > 0 ||
    sortOption !== "Recommended";

  const activeFilterChips = [
    filters.vehicleType !== "All Types" ? filters.vehicleType : null,
    filters.priceRange !== "All" ? filters.priceRange : null,
    filters.seats !== "All" ? `${filters.seats} seats` : null,
    filters.transmission !== "All" ? filters.transmission : null,
    filters.fuelType !== "All" ? filters.fuelType : null,
    ...filters.features,
  ].filter(Boolean);

  const syncDraftFilters = () => {
    setDraftFilters(filters);
    setFiltersVisible(true);
  };

  const clearAllFilters = () => {
    const resetFilters = createDefaultFilters();
    setSearchQuery("");
    setSortOption("Recommended");
    setFilters(resetFilters);
    setDraftFilters(resetFilters);
  };

  const removeFilterChip = (chip) => {
    if (chip === filters.vehicleType) {
      setFilters((prev) => ({ ...prev, vehicleType: "All Types" }));
      return;
    }

    if (chip === filters.priceRange) {
      setFilters((prev) => ({ ...prev, priceRange: "All" }));
      return;
    }

    if (chip === `${filters.seats} seats`) {
      setFilters((prev) => ({ ...prev, seats: "All" }));
      return;
    }

    if (chip === filters.transmission) {
      setFilters((prev) => ({ ...prev, transmission: "All" }));
      return;
    }

    if (chip === filters.fuelType) {
      setFilters((prev) => ({ ...prev, fuelType: "All" }));
      return;
    }

    setFilters((prev) => ({
      ...prev,
      features: prev.features.filter((feature) => feature !== chip),
    }));
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setFiltersVisible(false);
  };

  const clearDraftFilters = () => {
    setDraftFilters(createDefaultFilters());
  };

  const renderSingleSelectSection = (title, options, value, onSelect) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{title}</Text>
      <View style={styles.filterOptionsWrap}>
        {options.map((option) => {
          const isSelected = value === option;

          return (
            <TouchableOpacity
              key={option}
              style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              activeOpacity={0.85}
              onPress={() => onSelect(option)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderFeatureSection = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>Features</Text>
      <View style={styles.filterOptionsWrap}>
        {FEATURE_OPTIONS.map((feature) => {
          const isSelected = draftFilters.features.includes(feature);

          return (
            <TouchableOpacity
              key={feature}
              style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              activeOpacity={0.85}
              onPress={() =>
                setDraftFilters((prev) => ({
                  ...prev,
                  features: isSelected
                    ? prev.features.filter((item) => item !== feature)
                    : [...prev.features, feature],
                }))
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextSelected,
                ]}
              >
                {feature}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderVehicle = ({ item }) => {
    const vehicleId = item?._id || item?.id || item?.plateNo;
    const imageUrl = getVehicleImageUrl(item);
    const failedKey = `vehicle-${vehicleId}`;
    const vehicleName = `${item?.make || ""} ${item?.model || ""}`.trim() || "Vehicle";
    const vehicleFit = tripData ? getVehicleLuggageFit(item, tripData) : null;
    const seatCount = getSeatCount(item);
    const engine = item?.engine || item?.engineType || item?.engineDisplacement;
    const exteriorColor =
      item?.exteriorColor || item?.color || item?.colour || item?.vehicleColor;
    const specs = [
      seatCount > 0
        ? { key: "seats", icon: "people-outline", value: `${seatCount} Seats`, label: "Capacity" }
        : null,
      item?.transmission
        ? {
            key: "transmission",
            icon: "git-compare-outline",
            value: item.transmission,
            label: "Transmission",
          }
        : null,
      item?.fuel
        ? { key: "fuel", icon: "speedometer-outline", value: item.fuel, label: "Fuel Type" }
        : null,
      engine
        ? { key: "engine", icon: "cog-outline", value: engine, label: "Engine" }
        : null,
    ].filter(Boolean);
    const openVehicleDetails = () =>
      navigation.navigate("VehicleDetails", {
        vehicle: item,
        tripData: tripData || null,
      });
    const vehicleMeta = [item?.year, item?.location].filter(Boolean).join(" • ");

    return (
      <TouchableOpacity
        activeOpacity={0.94}
        style={styles.card}
        onPress={openVehicleDetails}
      >
        <View style={styles.cardAccentBar} />

        <View style={styles.imageWrap}>
          {imageUrl && !failedImages[failedKey] ? (
            <Image
              key={`${vehicleId || "vehicle"}-${imageUrl}`}
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setFailedImages((prev) => ({ ...prev, [failedKey]: true }))}
            />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.imageFallbackText}>FleetDrive</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          {item?.category ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.category}</Text>
            </View>
          ) : null}

          <View style={styles.cardTextBlock}>
            <Text style={styles.title} numberOfLines={2}>
              {vehicleName}
            </Text>

            {vehicleMeta ? (
              <Text style={styles.meta} numberOfLines={2}>
                {vehicleMeta}
              </Text>
            ) : null}
          </View>

          {specs.length ? (
            <View style={styles.specsGrid}>
              {specs.map((spec) => (
                <View key={spec.key} style={styles.specItem}>
                  <View style={styles.specIconWrap}>
                    <Ionicons name={spec.icon} size={18} color="#F97316" />
                  </View>
                  <View style={styles.specTextWrap}>
                    <Text style={styles.specValue} numberOfLines={1}>
                      {spec.value}
                    </Text>
                    <Text style={styles.specLabel}>{spec.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {exteriorColor ? (
            <View style={styles.colorRow}>
              <View style={styles.colorIndicator}>
                <Ionicons name="color-palette-outline" size={15} color="#64748B" />
              </View>
              <View>
                <Text style={styles.colorValue}>{exteriorColor}</Text>
                <Text style={styles.colorLabel}>Exterior Color</Text>
              </View>
            </View>
          ) : null}

          {vehicleFit ? (
            <View style={styles.fitNote}>
              <Ionicons name="sparkles-outline" size={15} color="#F97316" />
              <Text style={styles.fitNoteText} numberOfLines={2}>
                {vehicleFit.recommendation}
              </Text>
            </View>
          ) : null}

          <View style={styles.cardFooter}>
            <Text style={styles.price}>{formatVehicleDailyRateLabel(item)}</Text>
            <TouchableOpacity
              style={styles.viewDetailsButton}
              activeOpacity={0.9}
              onPress={openVehicleDetails}
            >
              <Text style={styles.viewDetailsButtonText}>View Details</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.heroHeaderCard}>
        <View style={styles.heroHeaderAccent} />
        <View style={styles.heroHeaderContentRow}>
          <View style={styles.heroHeaderTextBlock}>
            <Text style={styles.header}>Browse Cars</Text>
            <Text style={styles.headerSubtext} numberOfLines={2}>
              Find the right ride for your next trip.
            </Text>
          </View>

          <View style={styles.heroVehicleWrap}>
            <Image
              source={require("../../assets/Inovva.png")}
              style={styles.heroVehicleImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      {tripData && (
        <View style={styles.tripSummaryCard}>
          <Text style={styles.tripSummaryTitle}>Trip Planner Applied</Text>
          <Text style={styles.tripSummaryText}>
            {tripData.destination || "Destination not set"} |{" "}
            {tripData.passengers || 0} passenger(s) |{" "}
            {hasBudgetPreference(tripData.budget)
              ? `Budget up to PHP ${Number(tripData.budget).toLocaleString()}`
              : "No budget cap"}
          </Text>
          <Text style={styles.tripSummaryText}>
            Luggage: {formatLuggageSummary(tripData)}
          </Text>
        </View>
      )}

      <View style={styles.filterCard}>
        <View style={styles.searchInputWrapper}>
          <Feather name="search" size={18} color="#98A2B3" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search make, model, or category"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterSortRow}>
          <TouchableOpacity
            style={styles.filterButton}
            activeOpacity={0.9}
            onPress={syncDraftFilters}
          >
            <Ionicons name="options-outline" size={18} color="#0F172A" />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sortGroup}
          >
            {SORT_OPTIONS.map((option) => {
              const selected = sortOption === option;

              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.sortButton, selected && styles.sortButtonSelected]}
                  activeOpacity={0.85}
                  onPress={() => setSortOption(option)}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      selected && styles.sortButtonTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {hasActiveFilters ? (
          <View style={styles.activeFilterArea}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeFilterChips}
            >
              {activeFilterChips.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.activeFilterChip}
                  activeOpacity={0.85}
                  onPress={() => removeFilterChip(chip)}
                >
                  <Text style={styles.activeFilterChipText}>{chip}</Text>
                  <Ionicons name="close" size={14} color="#F47C20" />
                </TouchableOpacity>
              ))}

              {searchQuery.trim() ? (
                <TouchableOpacity
                  style={styles.activeFilterChip}
                  activeOpacity={0.85}
                  onPress={() => setSearchQuery("")}
                >
                  <Text style={styles.activeFilterChipText}>
                    Search: {searchQuery.trim()}
                  </Text>
                  <Ionicons name="close" size={14} color="#F47C20" />
                </TouchableOpacity>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={styles.clearAllInlineButton}
              activeOpacity={0.85}
              onPress={clearAllFilters}
            >
              <Text style={styles.clearAllInlineButtonText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultText}>
            {filteredVehicles.length} result
            {filteredVehicles.length !== 1 ? "s" : ""}
          </Text>
        </View>
        {!!loadMessage ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyText}>{loadMessage}</Text>
          </View>
        ) : null}
      </View>
  );

  const renderFooter = () => {
    if (loadingNextPage) {
      return (
        <View style={styles.nextPageLoader}>
          <ActivityIndicator size="small" color="#F97316" />
        </View>
      );
    }

    if (nextPageMessage && hasMoreVehicles) {
      return (
        <TouchableOpacity
          style={styles.nextPageRetry}
          activeOpacity={0.85}
          onPress={() =>
            loadVehiclesPage(currentPage + 1, {
              generation: requestGenerationRef.current,
            })
          }
        >
          <Text style={styles.nextPageRetryText}>{nextPageMessage}</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const loadNextPage = () => {
    if (
      vehiclesLoading ||
      loadingNextPageRef.current ||
      nextPageMessage ||
      !hasMoreVehicles
    ) {
      return;
    }

    loadVehiclesPage(currentPage + 1, {
      generation: requestGenerationRef.current,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <FlatList
          data={filteredVehicles}
          keyExtractor={getVehicleKey}
          renderItem={renderVehicle}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={PAGE_SIZE}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={7}
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.45}
          ListHeaderComponent={renderHeader()}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyStateCard}>
              {vehiclesLoading ? (
                <>
                  <Text style={styles.emptyTitle}>Loading vehicles...</Text>
                  <Text style={styles.emptyText}>
                    FleetX is preparing the latest available vehicles for you.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>No vehicles match your filters.</Text>
                  <Text style={styles.emptyText}>
                    Try adjusting your search or clearing filters.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    activeOpacity={0.9}
                    onPress={clearAllFilters}
                  >
                    <Text style={styles.emptyStateButtonText}>Clear Filters</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          }
        />
      </View>

      <Modal
        visible={filtersVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFiltersVisible(false)}
      >
        <Pressable
          style={styles.filterModalOverlay}
          onPress={() => setFiltersVisible(false)}
        >
          <Pressable style={styles.filterSheet} onPress={() => null}>
            <View style={styles.filterSheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filter your search</Text>
              <TouchableOpacity
                style={styles.filterSheetClose}
                activeOpacity={0.85}
                onPress={() => setFiltersVisible(false)}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filterSheetContent}
            >
              {renderSingleSelectSection(
                "Vehicle Type",
                VEHICLE_TYPE_OPTIONS,
                draftFilters.vehicleType,
                (value) => setDraftFilters((prev) => ({ ...prev, vehicleType: value }))
              )}
              {renderSingleSelectSection(
                "Price Range",
                PRICE_RANGE_OPTIONS,
                draftFilters.priceRange,
                (value) => setDraftFilters((prev) => ({ ...prev, priceRange: value }))
              )}
              {renderSingleSelectSection(
                "Seats",
                SEAT_OPTIONS,
                draftFilters.seats,
                (value) => setDraftFilters((prev) => ({ ...prev, seats: value }))
              )}
              {renderSingleSelectSection(
                "Transmission",
                TRANSMISSION_OPTIONS,
                draftFilters.transmission,
                (value) => setDraftFilters((prev) => ({ ...prev, transmission: value }))
              )}
              {renderSingleSelectSection(
                "Fuel Type",
                FUEL_TYPE_OPTIONS,
                draftFilters.fuelType,
                (value) => setDraftFilters((prev) => ({ ...prev, fuelType: value }))
              )}
              {renderFeatureSection()}
            </ScrollView>

            <View style={styles.filterFooter}>
              <TouchableOpacity
                style={styles.clearFilterButton}
                activeOpacity={0.9}
                onPress={clearDraftFilters}
              >
                <Text style={styles.clearFilterButtonText}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFilterButton}
                activeOpacity={0.9}
                onPress={applyFilters}
              >
                <Text style={styles.applyFilterButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
