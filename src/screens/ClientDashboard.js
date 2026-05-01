import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getClientProfile, getNotifications, getVehicles } from "../api/clientApi";
import { styles } from "../styles/clientDashboardStyle";
import { getProfileImageUrl, getVehicleImageUrl } from "../utils/imageUrl";

const vehicleTypes = [
  { key: "suv", label: "SUV" },
  { key: "sedan", label: "Sedan" },
  { key: "van", label: "Van" },
  { key: "pickup", label: "Pickup" },
  { key: "mpv", label: "MPV" },
];

export default function ClientDashboard({ navigation }) {
  const { width } = useWindowDimensions();
  const [clientName, setClientName] = useState("Client");
  const [profileImage, setProfileImage] = useState(null);
  const [dashboardVehicles, setDashboardVehicles] = useState([]);
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [failedImages, setFailedImages] = useState({});

  const featuredCardWidth = Math.min(260, Math.max(220, width * 0.68));

  const loadCachedProfile = async () => {
      try {
        let storedUser = "";
        let savedName = "";
        let savedImage = "";
        if (Platform.OS === "web") {
          storedUser = window.localStorage.getItem("clientUser") || "";
          savedName = window.localStorage.getItem("clientName") || "";
          savedImage = window.localStorage.getItem("profileImage") || "";
        } else {
          storedUser = (await AsyncStorage.getItem("clientUser")) || "";
          savedName = (await AsyncStorage.getItem("clientName")) || "";
          savedImage = (await AsyncStorage.getItem("profileImage")) || "";
        }
        const user = storedUser ? JSON.parse(storedUser) : {};
        setClientName(user?.name || user?.fullName || savedName || "Client");
        setProfileImage(getProfileImageUrl({ ...(user || {}), profileImage: savedImage || user?.profileImage }));
      } catch (err) {
        console.log("Load cached profile error:", err?.message || err);
      }
  };

  const refreshDashboardData = async () => {
    try {
      setVehiclesLoading(true);
      await loadCachedProfile();
      const [profileRes, vehicleRes, notificationRes] = await Promise.all([
        getClientProfile().catch(() => null),
        getVehicles(),
        getNotifications(50).catch(() => ({ unreadCount: 0, notifications: [] })),
      ]);

      const profileUser = profileRes?.user || null;
      if (profileUser) {
        const nextImage = getProfileImageUrl(profileUser);
        setClientName(profileUser?.name || profileUser?.fullName || "Client");
        setProfileImage(nextImage);
        if (Platform.OS === "web") {
          window.localStorage.setItem("clientUser", JSON.stringify(profileUser));
          if (nextImage) window.localStorage.setItem("profileImage", nextImage);
          if (profileUser?.name) window.localStorage.setItem("clientName", profileUser.name);
        } else {
          await AsyncStorage.setItem("clientUser", JSON.stringify(profileUser));
          if (nextImage) await AsyncStorage.setItem("profileImage", nextImage);
          if (profileUser?.name) await AsyncStorage.setItem("clientName", profileUser.name);
        }
      }

      const responseVehicles = Array.isArray(vehicleRes?.vehicles)
        ? vehicleRes.vehicles
        : Array.isArray(vehicleRes)
        ? vehicleRes
        : [];
      const backendVehicles = responseVehicles.filter(
        (vehicle) => vehicle?.isActive !== false
      );
      setDashboardVehicles(backendVehicles);
      setFeaturedVehicles(backendVehicles.slice(0, 8));
      const notifications = notificationRes?.notifications || notificationRes?.items || [];
      const nextUnreadCount =
        Number(notificationRes?.unreadCount ?? notificationRes?.count ?? NaN) ||
        notifications.filter((item) => !item?.read && !item?.isRead && !item?.readAt).length;
      setUnreadCount(nextUnreadCount);
    } catch (err) {
      console.log("Load dashboard data error:", err?.response?.data || err.message);
      setDashboardVehicles([]);
      setFeaturedVehicles([]);
    } finally {
      setVehiclesLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboardData();
    const unsubscribe = navigation.addListener("focus", refreshDashboardData);
    return unsubscribe;
  }, [navigation]);

  const firstName = useMemo(() => {
    if (!clientName) return "Client";
    return clientName.trim().split(" ")[0];
  }, [clientName]);

  const getVehicleName = (vehicle) =>
    vehicle.name || `${vehicle.make || ""} ${vehicle.model || ""}`.trim() || "Vehicle";

  const getVehicleMeta = (vehicle) => {
    const seats = vehicle.seats || `${vehicle.seater || "N/A"} seats`;
    return [seats, vehicle.transmission, vehicle.fuel].filter(Boolean).join(" - ");
  };

  const categoryItems = useMemo(
    () =>
      vehicleTypes.map((type) => {
        const sampleVehicle = dashboardVehicles.find(
          (vehicle) => String(vehicle?.category || "").toLowerCase() === type.key
        );
        return {
          ...type,
          image: getVehicleImageUrl(sampleVehicle),
        };
      }),
    [dashboardVehicles]
  );

  const markImageFailed = (key) => {
    setFailedImages((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Text style={styles.iconButtonSymbol}>Bell</Text>
              {unreadCount > 0 ? (
                <View style={styles.notificationDot}>
                  <Text style={styles.notificationDotText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Profile")}
            >
              {profileImage && !failedImages.profile ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatar}
                  onError={() => markImageFailed("profile")}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{firstName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
            }}
            style={styles.heroBackground}
          />
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <Text style={styles.heroGreeting}>Good day,</Text>
            <Text style={styles.heroName}>{firstName}</Text>
            <Text style={styles.heroSubtitle}>Where are you headed today?</Text>

            <TouchableOpacity
              style={styles.planTripButton}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Plan")}
            >
              <Text style={styles.planTripButtonText}>Plan My Trip</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Type</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeScrollContent}
          >
            {categoryItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.typeChip}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate("Browse", {
                    screen: "BrowseMain",
                    params: { selectedCategory: item.label },
                  })
                }
              >
                {item.image && !failedImages[`type-${item.key}`] ? (
                  <Image
                    key={`type-${item.key}-${item.image}`}
                    source={{ uri: item.image }}
                    style={styles.typeChipImage}
                    onError={() => markImageFailed(`type-${item.key}`)}
                  />
                ) : (
                  <View style={styles.typeChipFallback}>
                    <Text style={styles.typeChipFallbackText}>{item.label.slice(0, 2)}</Text>
                  </View>
                )}
                <Text style={styles.typeLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>

          <View style={styles.quickAccessRow}>
            <TouchableOpacity
              style={[styles.quickAccessCard, styles.quickAccessCardDark]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Bookings")}
            >
              <View style={[styles.quickIconBox, styles.quickIconBoxDark]}>
                <Text style={styles.quickIconText}>Trip</Text>
              </View>

              <Text style={styles.quickAccessCardDarkText}>My Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAccessCard, styles.quickAccessCardLight]}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate("Browse", {
                  screen: "BrowseMain",
                })
              }
            >
              <View style={[styles.quickIconBox, styles.quickIconBoxLight]}>
                <Text style={styles.quickIconText}>Cars</Text>
              </View>

              <Text style={styles.quickAccessCardLightText}>Browse Cars</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>
              Featured Vehicles
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("Browse", {
                  screen: "BrowseMain",
                })
              }
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {vehiclesLoading ? (
            <View style={styles.featuredLoading}>
              <ActivityIndicator size="small" color="#f97316" />
              <Text style={styles.featuredLoadingText}>Loading vehicles...</Text>
            </View>
          ) : featuredVehicles.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScrollContent}
            >
              {featuredVehicles.map((vehicle) => {
                const vehicleId = vehicle._id || vehicle.id;
                const imageUrl = getVehicleImageUrl(vehicle);
                const imageKey = `featured-${vehicleId}`;
                return (
                  <TouchableOpacity
                    key={vehicleId}
                    style={[styles.vehicleCard, { width: featuredCardWidth }]}
                    activeOpacity={0.9}
                    onPress={() =>
                      navigation.navigate("Browse", {
                        screen: "VehicleDetails",
                        params: { vehicle, vehicleId: vehicle._id || vehicle.id },
                      })
                    }
                  >
                    {imageUrl && !failedImages[imageKey] ? (
                      <Image
                        key={`${vehicleId || "vehicle"}-${imageUrl}`}
                        source={{ uri: imageUrl }}
                        style={styles.vehicleImage}
                        resizeMode="cover"
                        onError={() => markImageFailed(imageKey)}
                      />
                    ) : (
                      <View style={styles.vehicleImageFallback}>
                        <Text style={styles.vehicleImageFallbackText}>FleetDrive</Text>
                      </View>
                    )}

                    <View style={styles.vehicleCardBody}>
                    <View style={styles.vehicleTopLine}>
                      <View style={styles.vehicleCategoryBadge}>
                        <Text style={styles.vehicleCategoryText} numberOfLines={1}>
                          {vehicle.category || "Vehicle"}
                        </Text>
                      </View>
                      <Text style={styles.vehicleStatus} numberOfLines={1}>
                        {vehicle.status || vehicle.availability || "Available"}
                      </Text>
                    </View>

                    <Text
                      style={styles.vehicleName}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {getVehicleName(vehicle)}
                    </Text>

                    <Text style={styles.vehicleMetaText} numberOfLines={1}>
                      {getVehicleMeta(vehicle)}
                    </Text>

                    <View style={styles.vehicleFooter}>
                      <Text style={styles.vehiclePrice}>
                        PHP {Number(vehicle.dailyRate || 0).toLocaleString()}/day
                      </Text>
                      <Text style={styles.vehicleButtonText}>View</Text>
                    </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.featuredEmpty}>
              <Text style={styles.featuredEmptyTitle}>No vehicles available</Text>
              <Text style={styles.featuredEmptyText}>
                Check Browse Cars for the latest FleetDrive inventory.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
