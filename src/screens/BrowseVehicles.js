import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
} from "react-native";
import { getVehicles } from "../api/clientApi";
import { styles } from "../styles/browseVehiclesStyle";
import { getVehicleImageUrl } from "../utils/imageUrl";

const categories = ["All", "SUV", "Sedan", "Van", "Pickup", "MPV"];
const PAGE_SIZE = 10;

export default function BrowseVehicles({ navigation, route }) {
  const tripData = route?.params?.tripData || null;
  const selectedCategoryFromRoute = route?.params?.selectedCategory || "All";

  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    selectedCategoryFromRoute
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
      setSelectedCategory(route.params.selectedCategory);
      setVisibleCount(PAGE_SIZE);
    }
  }, [route?.params?.selectedCategory]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedCategory, tripData]);

  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];
    const searchValue = search.toLowerCase().trim();

    if (searchValue) {
      result = result.filter((vehicle) => {
        const makeModel =
          `${vehicle.make || ""} ${vehicle.model || ""}`.toLowerCase();
        const plateNo = String(vehicle.plateNo || "").toLowerCase();
        const location = String(vehicle.location || "").toLowerCase();

        return (
          makeModel.includes(searchValue) ||
          plateNo.includes(searchValue) ||
          location.includes(searchValue)
        );
      });
    }

    if (selectedCategory !== "All") {
      result = result.filter(
        (vehicle) =>
          String(vehicle.category || "").toLowerCase() ===
          selectedCategory.toLowerCase()
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

    return result;
  }, [vehicles, search, selectedCategory, tripData]);

  const visibleVehicles = useMemo(
    () => filteredVehicles.slice(0, visibleCount),
    [filteredVehicles, visibleCount]
  );

  const hasMoreVehicles = visibleCount < filteredVehicles.length;

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

        <Text style={styles.price}>PHP {item.dailyRate || 0}/day</Text>
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
        <TextInput
          style={styles.searchInput}
          placeholder="Search vehicles..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setVisibleCount(PAGE_SIZE);
          }}
        />

        <View style={styles.chipsRow}>
          {categories.map((cat) => {
            const active = selectedCategory === cat;

            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setVisibleCount(PAGE_SIZE);
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No matching vehicles found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your trip plan or search filters.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
