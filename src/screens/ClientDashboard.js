import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getFriendlyApiErrorMessage } from "../api/api";
import { getClientBookings, getClientProfile, getNotifications, getVehicles } from "../api/clientApi";
import { getActivePromo } from "../api/publicApi";
import NotificationIcon from "../components/NotificationIcon";
import { styles } from "../styles/clientDashboardStyle";
import { getProfileImageUrl, getVehicleImageUrl } from "../utils/imageUrl";
import { formatVehicleDailyRateLabel } from "../utils/vehicleRate";
import { getUnreadLocalNotificationCount } from "../services/notificationService";

const vehicleTypes = [
  { key: "suv", label: "SUV" },
  { key: "sedan", label: "Sedan" },
  { key: "van", label: "Van" },
  { key: "pickup", label: "Pickup" },
];

const QUICK_ACCESS_ITEMS = [
  {
    key: "bookings",
    title: "My Bookings",
    icon: "calendar-clear-outline",
    cardStyle: "dark",
    onPress: (navigation, openProtectedRoute) => openProtectedRoute("Bookings"),
  },
  {
    key: "browse",
    title: "Browse Cars",
    icon: "car-sport-outline",
    cardStyle: "light",
    onPress: (navigation) =>
      navigation.navigate("Browse", {
        screen: "BrowseMain",
      }),
  },
];
const DASHBOARD_VEHICLE_CACHE_KEY = "fleetx_dashboard_vehicles_cache_v1";

const getUnreadCountFromResponse = (notificationRes) => {
  const explicitCount = Number(
    notificationRes?.unreadCount ?? notificationRes?.count ?? Number.NaN
  );
  if (Number.isFinite(explicitCount) && explicitCount >= 0) {
    return explicitCount;
  }

  const notifications = Array.isArray(notificationRes?.notifications)
    ? notificationRes.notifications
    : Array.isArray(notificationRes?.items)
    ? notificationRes.items
    : [];

  return notifications.filter(
    (item) => !item?.read && !item?.isRead && !item?.readAt
  ).length;
};

export default function ClientDashboard({ navigation }) {
  const { width } = useWindowDimensions();
  const [clientName, setClientName] = useState("Client");
  const [profileImage, setProfileImage] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [dashboardVehicles, setDashboardVehicles] = useState([]);
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [promoLoading, setPromoLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [failedImages, setFailedImages] = useState({});
  const [activePromo, setActivePromo] = useState(null);

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
      setPromoLoading(true);
      if (__DEV__) {
        console.log("[PromoBanner][fetch:start]");
      }
      await loadCachedProfile();
      try {
        const cachedVehiclesRaw =
          Platform.OS === "web"
            ? window.localStorage.getItem(DASHBOARD_VEHICLE_CACHE_KEY)
            : await AsyncStorage.getItem(DASHBOARD_VEHICLE_CACHE_KEY);
        if (cachedVehiclesRaw) {
          const parsedVehicles = JSON.parse(cachedVehiclesRaw);
          if (Array.isArray(parsedVehicles) && parsedVehicles.length) {
            setDashboardVehicles(parsedVehicles);
            setFeaturedVehicles(parsedVehicles.slice(0, 8));
          }
        }
      } catch {
        // Ignore cache parsing issues and continue with live refresh.
      }

      const token =
        Platform.OS === "web"
          ? window.localStorage.getItem("clientToken") || window.localStorage.getItem("token")
          : (await AsyncStorage.getItem("clientToken")) || (await AsyncStorage.getItem("token"));
      const hasToken = Boolean(token);
      setIsSignedIn(hasToken);
      const localUnreadCount = hasToken ? await getUnreadLocalNotificationCount() : 0;
      const [profileResult, vehicleResult, notificationResult, bookingsResult, promoResult] = await Promise.allSettled([
        hasToken ? getClientProfile() : Promise.resolve(null),
        getVehicles(),
        hasToken ? getNotifications(50) : Promise.resolve({ unreadCount: 0, notifications: [] }),
        hasToken ? getClientBookings() : Promise.resolve({ bookings: [] }),
        getActivePromo(),
      ]);

      const profileRes =
        profileResult.status === "fulfilled" ? profileResult.value : null;
      const vehicleRes =
        vehicleResult.status === "fulfilled" ? vehicleResult.value : [];
      const notificationRes =
        notificationResult.status === "fulfilled"
          ? notificationResult.value
          : { unreadCount: 0, notifications: [] };
      const bookingsRes =
        bookingsResult.status === "fulfilled" ? bookingsResult.value : { bookings: [] };
      const promoRes = promoResult.status === "fulfilled" ? promoResult.value : null;
      if (promoResult.status === "rejected") {
        console.log("[PromoBanner][fetch:warning]", promoResult.reason?.message || promoResult.reason || "Unable to load promo");
      }

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
      if (Platform.OS === "web") {
        window.localStorage.setItem(
          DASHBOARD_VEHICLE_CACHE_KEY,
          JSON.stringify(backendVehicles)
        );
      } else {
        await AsyncStorage.setItem(
          DASHBOARD_VEHICLE_CACHE_KEY,
          JSON.stringify(backendVehicles)
        );
      }
      setUnreadCount(getUnreadCountFromResponse(notificationRes) + localUnreadCount);
      setActivePromo(promoRes || null);

      if (__DEV__) {
        console.log("[PromoBanner][fetch:response]", {
          hasPromo: Boolean(promoRes?.id || promoRes?.title),
          hasVehicleId: Boolean(promoRes?.vehicleId),
          hasVehicle: Boolean(promoRes?.vehicle),
          hasCode: Boolean(promoRes?.promoCode),
          hasDiscount: Boolean(promoRes?.discountLabel || Number(promoRes?.discountValue || 0) > 0),
          hasImage: Boolean(promoRes?.imageUrl),
        });
        console.log("[PromoBanner][vehicle:resolve]", {
          hasVehicleId: Boolean(promoRes?.vehicleId),
          fetchedVehicle: Boolean(
            promoRes?.vehicle?.dailyRate ||
              promoRes?.vehicle?.rate24Hr ||
              promoRes?.vehicle?.year ||
              promoRes?.vehicle?.description ||
              promoRes?.vehicle?.imageUrl ||
              promoRes?.vehicle?.image ||
              (Array.isArray(promoRes?.vehicle?.images) && promoRes.vehicle.images.length)
          ),
          hasVehicleImage: Boolean(getVehicleImageUrl(promoRes?.vehicle)),
          hasVehicleName: Boolean(getVehicleName(promoRes?.vehicle || {})),
        });
      }

    } catch (err) {
      console.log("Load dashboard data error:", err?.response?.data || err.message);
      if (__DEV__) {
        console.log(
          "[Dashboard][friendly-error]",
          getFriendlyApiErrorMessage(err, "Dashboard data is temporarily unavailable.")
        );
      }
      setUnreadCount(await getUnreadLocalNotificationCount());
      setActivePromo(null);
    } finally {
      setVehiclesLoading(false);
      setPromoLoading(false);
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

  const promoBanner = activePromo;
  const promoVehicle = promoBanner?.vehicle || null;
  const promoDescription = promoBanner?.description || "";
  const promoCode = promoBanner?.promoCode || promoBanner?.code || "";
  const promoButtonLabel = promoBanner?.ctaLabel || "";
  const openPromoTarget = (target = "banner") => {
    if (!promoBanner) return;

    const hasVehicleTarget = Boolean(promoBanner.vehicleId || promoVehicle);

    if (__DEV__) {
      console.log("[PromoBanner][press]", {
        target,
        hasVehicleId: Boolean(promoBanner.vehicleId),
        hasPromoCode: Boolean(promoBanner.promoCode),
      });
    }

    if (hasVehicleTarget) {
      navigation.navigate("Browse", {
        screen: "VehicleDetails",
        params: {
          vehicle: promoVehicle || undefined,
          vehicleId: promoBanner.vehicleId || promoVehicle?._id || promoVehicle?.id || "",
          promoCode: promoBanner.promoCode || "",
          source: "promo_banner",
        },
      });
      return;
    }

    navigation.navigate("Plan", {
      promoCode: promoBanner.promoCode || "",
      promoFeedback: promoBanner.promoCode
        ? {
            status: "info",
            message: "Promo code added from FleetX promo. Tap Apply to validate.",
          }
        : undefined,
      source: "promo_banner",
    });
  };

  const handlePromoCodePress = () => {
    openPromoTarget("use_code");
  };

  const promptGuestAuth = () => {
    const message =
      "You can browse vehicles and plan your trip as a guest. Please log in or create an account to continue.";

    Alert.alert("Sign in to continue", message, [
      { text: "Log In", onPress: () => navigation.navigate("ClientLogin") },
      { text: "Create Account", onPress: () => navigation.navigate("RegisterClient") },
      { text: "Not now", style: "cancel" },
    ]);
  };

  const openProtectedRoute = async (routeName) => {
    try {
      const token =
        Platform.OS === "web"
          ? window.localStorage.getItem("clientToken") || window.localStorage.getItem("token")
          : (await AsyncStorage.getItem("clientToken")) || (await AsyncStorage.getItem("token"));

      if (!token) {
        promptGuestAuth();
        return;
      }

      navigation.navigate(routeName);
    } catch (err) {
      console.log("Protected route error:", err?.message || err);
      promptGuestAuth();
    }
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
            <NotificationIcon
              unreadCount={unreadCount}
              onPress={() => openProtectedRoute("Notifications")}
            />

            <Pressable
              style={styles.avatarButton}
              onPress={() => openProtectedRoute("Profile")}
            >
              {profileImage && !failedImages.profile ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatar}
                  onError={() => markImageFailed("profile")}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  {isSignedIn ? (
                    <Text style={styles.avatarFallbackText}>
                      {firstName.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <Ionicons name="person-outline" size={23} color="#ffffff" />
                  )}
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <ImageBackground
            source={require("../../assets/images/home-hero-bg.png")}
            style={styles.heroBackground}
            imageStyle={styles.heroBackgroundImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              Your next trip starts here.
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={2}>
              Find the right ride for your journey.
            </Text>

            <TouchableOpacity
              style={styles.planTripButton}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Plan")}
            >
              <Text style={styles.planTripButtonText}>Plan My Trip</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!promoLoading && promoBanner ? (
          <View style={styles.campaignCard}>
            <Pressable style={styles.campaignContent} onPress={() => openPromoTarget("banner")}>
              <View style={styles.campaignColumns}>
                <View style={styles.campaignLeftColumn}>
                  <View style={styles.campaignEyebrowRow}>
                    {promoBanner.subtitle ? (
                      <Text style={styles.campaignLabel}>{promoBanner.subtitle}</Text>
                    ) : null}
                    {promoBanner.discountLabel ? (
                      <View style={styles.campaignBadge}>
                        <Text style={styles.campaignBadgeText}>{promoBanner.discountLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.campaignTitle} numberOfLines={2}>
                    {promoBanner.title}
                  </Text>
                  {promoDescription ? (
                    <Text style={styles.campaignSubtitle} numberOfLines={2}>
                      {promoDescription}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.campaignDivider} />
                <View style={styles.campaignRightColumn}>
                  {promoCode ? (
                    <View style={styles.campaignCodeBlock}>
                      <Text style={styles.campaignCodeLabel}>Promo code</Text>
                      <Text style={styles.campaignCodeValue} numberOfLines={1} adjustsFontSizeToFit>
                        {promoCode}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.campaignActions}>
                    {promoCode ? (
                      <TouchableOpacity
                        style={styles.campaignCodeButton}
                        activeOpacity={0.9}
                        onPress={handlePromoCodePress}
                      >
                        <Text style={styles.campaignCodeButtonText}>Use Code</Text>
                      </TouchableOpacity>
                    ) : null}
                    {promoButtonLabel ? (
                      <TouchableOpacity
                        style={styles.campaignButton}
                        activeOpacity={0.9}
                        onPress={() => openPromoTarget("cta")}
                      >
                        <Text style={styles.campaignButtonText}>{promoButtonLabel}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

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
                <View style={styles.typeChipImageWrap}>
                  {item.image && !failedImages[`type-${item.key}`] ? (
                    <Image
                      key={`type-${item.key}-${item.image}`}
                      source={{ uri: item.image }}
                      style={styles.typeChipImage}
                      resizeMode="contain"
                      onError={() => markImageFailed(`type-${item.key}`)}
                    />
                  ) : (
                    <View style={styles.typeChipFallback}>
                      <Text style={styles.typeChipFallbackText}>{item.label.slice(0, 2)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.typeLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>

          <View style={styles.quickAccessRow}>
            {QUICK_ACCESS_ITEMS.map((item) => {
              const isDarkCard = item.cardStyle === "dark";

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.quickAccessCard,
                    isDarkCard ? styles.quickAccessCardDark : styles.quickAccessCardLight,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => item.onPress(navigation, openProtectedRoute)}
                >
                  <View style={styles.quickAccessCardContent}>
                    <View
                      style={[
                        styles.quickIconBox,
                        isDarkCard ? styles.quickIconBoxDark : styles.quickIconBoxLight,
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={isDarkCard ? "#F8FAFC" : "#F97316"}
                      />
                    </View>

                    <Text
                      style={[
                        styles.quickAccessTitle,
                        isDarkCard
                          ? styles.quickAccessCardDarkText
                          : styles.quickAccessCardLightText,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
                        {String(vehicle.status || vehicle.availability || "Available").toLowerCase() ===
                        "available"
                          ? "Available"
                          : vehicle.status || vehicle.availability}
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
                        {formatVehicleDailyRateLabel(vehicle)}
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
