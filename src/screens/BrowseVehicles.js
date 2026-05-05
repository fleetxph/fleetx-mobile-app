import { useEffect, useMemo, useState } from "react";
import {
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
import { Feather, Ionicons } from "@expo/vector-icons";
import { getVehicles } from "../api/clientApi";
import { styles } from "../styles/browseVehiclesStyle";
import { getVehicleImageUrl } from "../utils/imageUrl";

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

function getVehicleRate(vehicle) {
  const rawRate = Number(
    vehicle?.dailyRate ??
      vehicle?.price ??
      vehicle?.rate24Hr ??
      vehicle?.rate12Hr ??
      vehicle?.rentalPrice ??
      0
  );

  return Number.isFinite(rawRate) ? rawRate : 0;
}

function getSeatCount(vehicle) {
  const rawSeats = Number(vehicle?.seater ?? vehicle?.seats ?? 0);
  return Number.isFinite(rawSeats) ? rawSeats : 0;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("Recommended");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState(
    createDefaultFilters(normalizedRouteCategory || "All Types")
  );
  const [draftFilters, setDraftFilters] = useState(
    createDefaultFilters(normalizedRouteCategory || "All Types")
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [failedImages, setFailedImages] = useState({});

  const loadVehicles = async () => {
    try {
      const res = await getVehicles({
        startDate: tripData?.startDate,
        endDate: tripData?.endDate,
      });
      const nextVehicles = Array.isArray(res?.vehicles)
        ? res.vehicles
        : Array.isArray(res)
        ? res
        : [];
      setVehicles(nextVehicles);
    } catch (err) {
      console.log("Load vehicles error:", err?.response?.data || err.message);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [tripData?.endDate, tripData?.startDate]);

  useEffect(() => {
    if (route?.params?.selectedCategory) {
      const nextCategory =
        VEHICLE_TYPE_OPTIONS.find(
          (item) => normalizeText(item) === normalizeText(route.params.selectedCategory)
        ) || "All Types";

      setFilters((prev) => ({ ...prev, vehicleType: nextCategory }));
      setDraftFilters((prev) => ({ ...prev, vehicleType: nextCategory }));
      setVisibleCount(PAGE_SIZE);
    }
  }, [route?.params?.selectedCategory]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, searchQuery, sortOption, tripData]);

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
        const rate = getVehicleRate(vehicle);

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

      if (tripData.budget) {
        result = result.filter(
          (vehicle) => Number(vehicle.dailyRate || 0) <= Number(tripData.budget)
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
      result.sort((a, b) => getVehicleRate(a) - getVehicleRate(b));
    } else if (sortOption === "Price: High to Low") {
      result.sort((a, b) => getVehicleRate(b) - getVehicleRate(a));
    } else if (sortOption === "Seats: Low to High") {
      result.sort((a, b) => getSeatCount(a) - getSeatCount(b));
    } else if (sortOption === "Seats: High to Low") {
      result.sort((a, b) => getSeatCount(b) - getSeatCount(a));
    }

    return result;
  }, [filters, searchQuery, sortOption, tripData, vehicles]);

  const visibleVehicles = useMemo(
    () => filteredVehicles.slice(0, visibleCount),
    [filteredVehicles, visibleCount]
  );

  const hasMoreVehicles = visibleCount < filteredVehicles.length;
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
    setVisibleCount(PAGE_SIZE);
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

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() =>
          navigation.navigate("VehicleDetails", {
            vehicle: item,
            tripData: tripData || null,
          })
        }
      >
        {imageUrl && !failedImages[failedKey] ? (
          <Image
            key={`${vehicleId || "vehicle"}-${imageUrl}`}
            source={{ uri: imageUrl }}
            style={styles.image}
            onError={() => setFailedImages((prev) => ({ ...prev, [failedKey]: true }))}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>FleetDrive</Text>
          </View>
        )}

      <View style={styles.cardBody}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.category || "Vehicle"}</Text>
        </View>

        <Text style={styles.title}>
          {item.make} {item.model}
        </Text>

        <Text style={styles.meta}>
          {item.year || "N/A"} | {item.location || "N/A"}
        </Text>

        <Text style={styles.price}>PHP {getVehicleRate(item).toLocaleString()}/day</Text>
      </View>
    </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.header}>Browse Cars</Text>

      {tripData && (
        <View style={styles.tripSummaryCard}>
          <Text style={styles.tripSummaryTitle}>Trip Planner Applied</Text>
          <Text style={styles.tripSummaryText}>
            {tripData.destination || "Destination not set"} |{" "}
            {tripData.passengers || 0} passenger(s) | Budget up to PHP
            {Number(tripData.budget || 0).toLocaleString()}
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
            onChangeText={(value) => {
              setSearchQuery(value);
              setVisibleCount(PAGE_SIZE);
            }}
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

      <Text style={styles.resultText}>
        {filteredVehicles.length} result
        {filteredVehicles.length !== 1 ? "s" : ""}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!filteredVehicles.length) return null;

    if (hasMoreVehicles) {
      return (
        <TouchableOpacity
          style={styles.loadMoreButton}
          activeOpacity={0.9}
          onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
        >
          <Text style={styles.loadMoreButtonText}>Load More Vehicles</Text>
        </TouchableOpacity>
      );
    }

    return <Text style={styles.endText}>You've reached the end.</Text>;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <FlatList
          data={visibleVehicles}
          keyExtractor={(item, index) => String(item._id || item.id || index)}
          renderItem={renderVehicle}
          numColumns={2}
          columnWrapperStyle={
            visibleVehicles.length > 1
              ? styles.columnWrapper
              : null
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={PAGE_SIZE}
          maxToRenderPerBatch={PAGE_SIZE}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyStateCard}>
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
