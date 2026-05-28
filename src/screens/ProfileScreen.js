import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../styles/profileStyle";
import { clearClientSession, isUnauthorizedError } from "../api/api";
import {
  getClientProfile,
  getVerificationStatus,
  updateClientProfilePhoto,
} from "../api/clientApi";
import {
  getBookingEligibility,
  getVerificationActionLabel,
  getVerificationBadgeLabel,
  getVerificationStatusTone,
  getVerificationSubtitle,
} from "../utils/verification";
import { getProfileImageUrl } from "../utils/imageUrl";
import { useAuth } from "../context/AuthContext";
import {
  generatePushTokenForDebug,
  getPushRegistrationDiagnosticState,
  getStoredNotificationPermissionState,
  syncPushTokenForDebug,
} from "../services/notificationService";

function getToneStyles(tone) {
  if (tone === "warning") {
    return [styles.smallBadgeWarning, styles.smallBadgeTextWarning];
  }
  if (tone === "info") {
    return [styles.smallBadgeInfo, styles.smallBadgeTextInfo];
  }
  if (tone === "success") {
    return [styles.smallBadgeSuccess, styles.smallBadgeTextSuccess];
  }
  if (tone === "danger") {
    return [styles.smallBadgeDanger, styles.smallBadgeTextDanger];
  }
  return [styles.smallBadgeNeutral, styles.smallBadgeTextNeutral];
}

export default function ProfileScreen({ navigation }) {
  const { logout } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [clientUser, setClientUser] = useState(null);
  const [clientName, setClientName] = useState("Client");
  const [clientEmail, setClientEmail] = useState("No email available");
  const [profileImage, setProfileImage] = useState(null);
  const [verificationData, setVerificationData] = useState(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState("undetermined");
  const [pushDiagnostic, setPushDiagnostic] = useState(null);
  const [pushDebugToken, setPushDebugToken] = useState("");
  const [pushTokenResult, setPushTokenResult] = useState(null);
  const [pushSyncResult, setPushSyncResult] = useState(null);
  const [generatingPushToken, setGeneratingPushToken] = useState(false);
  const [syncingPushToken, setSyncingPushToken] = useState(false);

  const loadProfile = async () => {
    try {
      const token =
        Platform.OS === "web"
          ? window.localStorage.getItem("clientToken") || window.localStorage.getItem("token")
          : (await AsyncStorage.getItem("clientToken")) || (await AsyncStorage.getItem("token"));

      if (!token) {
        setHasToken(false);
        setAuthChecked(true);
        setClientUser(null);
        setClientName("Guest");
        setClientEmail("Sign in to view your FleetX account");
        setProfileImage(null);
        setVerificationData(null);
        setNotificationPermissionStatus(await getStoredNotificationPermissionState());
        setPushDiagnostic(null);
        return;
      }

      setHasToken(true);
      setAuthChecked(true);
      let storedUser = "";
      let storedName = "";
      let storedEmail = "";
      let storedImage = "";

      if (Platform.OS === "web") {
        storedUser = window.localStorage.getItem("clientUser") || "";
        storedName = window.localStorage.getItem("clientName") || "";
        storedEmail = window.localStorage.getItem("clientEmail") || "";
        storedImage = window.localStorage.getItem("profileImage") || "";
      } else {
        storedUser = (await AsyncStorage.getItem("clientUser")) || "";
        storedName = (await AsyncStorage.getItem("clientName")) || "";
        storedEmail = (await AsyncStorage.getItem("clientEmail")) || "";
        storedImage = (await AsyncStorage.getItem("profileImage")) || "";
      }

      let parsedUser = null;

      if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser);
        } catch {
          parsedUser = null;
        }
      }

      setClientUser(parsedUser);
      setProfileImage(getProfileImageUrl({ ...(parsedUser || {}), profileImage: storedImage || parsedUser?.profileImage }));
      setClientName(
        parsedUser?.name || storedName || parsedUser?.fullName || "Client"
      );
      setClientEmail(parsedUser?.email || storedEmail || "No email available");

      try {
        const [profileResponse, verification] = await Promise.all([
          getClientProfile(),
          getVerificationStatus(),
        ]);
        const profileUser = profileResponse?.user || {};
        setVerificationData(verification || null);

        const nextUser = {
          ...(parsedUser || {}),
          ...profileUser,
          isVerified: Boolean(verification?.isVerified),
          verificationStatus:
            verification?.overallStatus ||
            profileUser?.verificationStatus ||
            parsedUser?.verificationStatus,
          verificationType:
            verification?.verificationType ||
            profileUser?.verificationType ||
            parsedUser?.verificationType,
          verificationLevel:
            verification?.verificationLevel || parsedUser?.verificationLevel,
          statusLabel: verification?.statusLabel || parsedUser?.statusLabel,
        };

        setClientUser(nextUser);
        const resolvedProfileImage = getProfileImageUrl(nextUser) || getProfileImageUrl({ profileImage: storedImage });
        setProfileImage(resolvedProfileImage);
        setClientName(
          nextUser?.name || storedName || nextUser?.fullName || "Client"
        );
        setClientEmail(nextUser?.email || storedEmail || "No email available");
        if (Platform.OS === "web") {
          window.localStorage.setItem("clientUser", JSON.stringify(nextUser));
        } else {
          await AsyncStorage.setItem("clientUser", JSON.stringify(nextUser));
        }
      } catch (verificationErr) {
        if (isUnauthorizedError(verificationErr)) {
          await clearClientSession();
          navigation.getParent()?.reset({
            index: 0,
            routes: [{ name: "ClientLogin" }],
          });
          return;
        }

        console.log(
          "Load verification error:",
          verificationErr?.message || verificationErr
        );
      }
    } catch (err) {
      console.log("Load profile error:", err?.message || err);
    } finally {
      setNotificationPermissionStatus(await getStoredNotificationPermissionState());
      try {
        setPushDiagnostic(await getPushRegistrationDiagnosticState());
      } catch (diagnosticError) {
        console.info("[PushNotifications][diagnostic]", {
          success: false,
          message: diagnosticError?.message || "Unable to read push diagnostics.",
        });
      }
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadProfile);
    loadProfile();
    return unsubscribe;
  }, [navigation]);

  const initials = useMemo(() => {
    const parts = (clientName || "Client").split(" ").filter(Boolean);
    if (parts.length === 0) return "C";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }, [clientName]);

  const verificationLabel = getVerificationBadgeLabel(verificationData);
  const verificationAction = getVerificationActionLabel(verificationData);
  const verificationTone = getVerificationStatusTone(verificationData);
  const eligibility = getBookingEligibility(verificationData);
  const notificationsDisabled = notificationPermissionStatus === "denied";
  const showPushDebug = process.env.EXPO_PUBLIC_SHOW_PUSH_DEBUG === "true";
  const [badgeBoxStyle, badgeTextStyle] = getToneStyles(verificationTone);
  const [withDriverBoxStyle, withDriverTextStyle] = getToneStyles(eligibility.withDriverTone);
  const [selfDriveBoxStyle, selfDriveTextStyle] = getToneStyles(eligibility.selfDriveTone);

  const refreshPushDiagnostic = async () => {
    setPushDiagnostic(await getPushRegistrationDiagnosticState());
    setNotificationPermissionStatus(await getStoredNotificationPermissionState());
  };

  const handleGeneratePushToken = async () => {
    if (generatingPushToken) return;
    setGeneratingPushToken(true);
    setPushTokenResult(null);
    try {
      const result = await generatePushTokenForDebug();
      setPushTokenResult(result);
      setPushDebugToken(result.token || "");
      await refreshPushDiagnostic();
    } catch (error) {
      setPushTokenResult({
        success: false,
        tokenGenerated: false,
        token: "",
        message: error?.message || "Unable to generate an Expo push token.",
      });
    } finally {
      setGeneratingPushToken(false);
    }
  };

  const handleCopyPushToken = async () => {
    if (!pushDebugToken) return;
    await Clipboard.setStringAsync(pushDebugToken);
    Alert.alert("Token copied", "Token copied.");
  };

  const handleSyncPushToken = async () => {
    if (syncingPushToken) return;
    setSyncingPushToken(true);
    setPushSyncResult(null);
    try {
      const result = await syncPushTokenForDebug(pushDebugToken);
      setPushSyncResult(result);
      await refreshPushDiagnostic();
    } catch (error) {
      setPushSyncResult({
        success: false,
        backendReached: false,
        status: null,
        message: error?.message || "Unable to sync the token to the backend.",
      });
    } finally {
      setSyncingPushToken(false);
    }
  };

  const DiagnosticRow = ({ label, value }) => (
    <View style={styles.diagnosticRow}>
      <Text style={styles.diagnosticLabel}>{label}</Text>
      <Text style={styles.diagnosticValue}>{value}</Text>
    </View>
  );

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri || !asset?.base64) {
        Alert.alert("Upload failed", "Could not prepare the selected image.");
        return;
      }

      const mimeType = asset.mimeType || "image/jpeg";
      const profileImageData = `data:${mimeType};base64,${asset.base64}`;
      const response = await updateClientProfilePhoto({ profileImage: profileImageData });
      const updatedUser = response?.user || {};
      const nextImage = getProfileImageUrl(updatedUser) || profileImageData;

      setProfileImage(nextImage);
      setClientUser((prev) => ({ ...(prev || {}), ...updatedUser }));
      setClientName(updatedUser?.name || clientName);
      setClientEmail(updatedUser?.email || clientEmail);

      if (Platform.OS === "web") {
        window.localStorage.setItem("profileImage", nextImage);
        window.localStorage.setItem(
          "clientUser",
          JSON.stringify({ ...(clientUser || {}), ...updatedUser })
        );
      } else {
        await AsyncStorage.setItem("profileImage", nextImage);
        await AsyncStorage.setItem(
          "clientUser",
          JSON.stringify({ ...(clientUser || {}), ...updatedUser })
        );
      }
      await loadProfile();
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await clearClientSession();
        navigation.getParent()?.reset({
          index: 0,
          routes: [{ name: "ClientLogin" }],
        });
        return;
      }

      console.log("Pick image error:", err?.message || err);
      Alert.alert("Upload failed", err?.response?.data?.message || "Could not update profile photo.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();

      navigation.getParent()?.reset({
        index: 0,
        routes: [{ name: "ClientLogin" }],
      });
    } catch (err) {
      console.log("Logout error:", err?.message || err);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: handleLogout },
    ]);
  };

  const openVerification = () => {
    const parentNavigation = navigation.getParent?.();
    if (parentNavigation?.navigate) {
      parentNavigation.navigate("Verification");
      return;
    }
    navigation.navigate("Verification");
  };

  const MenuItem = ({ icon, iconBg, title, subtitle, rightText, rightTone, onPress }) => {
    const [itemBadgeStyle, itemBadgeTextStyle] = getToneStyles(rightTone || "neutral");

    return (
      <TouchableOpacity
        style={styles.menuItem}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <View style={[styles.menuIconBox, { backgroundColor: iconBg }]}>
          {icon}
        </View>

        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
        </View>

        {rightText ? (
          <View style={[styles.smallBadge, itemBadgeStyle]}>
            <Text style={[styles.smallBadgeText, itemBadgeTextStyle]}>
              {rightText}
            </Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {!hasToken && authChecked ? (
        <>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.profileTop}>
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>G</Text>
              </View>
              <Text style={styles.profileName}>Guest Account</Text>
              <Text style={styles.profileEmail}>
                Sign in to manage your bookings, profile, verification, and notifications.
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>ACCOUNT</Text>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("ClientLogin")}
              >
                <View style={[styles.menuIconBox, { backgroundColor: "#fff7ed" }]}>
                  <Feather name="log-in" size={16} color="#f97316" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuTitle}>Log In</Text>
                  <Text style={styles.menuSubtitle}>Continue your booking and access account tools.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("RegisterClient")}
              >
                <View style={[styles.menuIconBox, { backgroundColor: "#eff6ff" }]}>
                  <Feather name="user-plus" size={16} color="#3b82f6" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuTitle}>Create Account</Text>
                  <Text style={styles.menuSubtitle}>Register when you are ready to confirm a booking.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate("Home")}
            >
              <Ionicons name="home-outline" size={20} color="#94a3b8" />
              <Text style={styles.navText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate("Browse")}
            >
              <Ionicons name="car-outline" size={20} color="#94a3b8" />
              <Text style={styles.navText}>Browse</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.planButton}
              onPress={() => navigation.navigate("Plan")}
            >
              <MaterialCommunityIcons name="map-outline" size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate("Bookings")}
            >
              <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
              <Text style={styles.navText}>Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="person" size={20} color="#f97316" />
              <Text style={[styles.navText, styles.navTextActive]}>Profile</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.profileTop}>
              <View style={styles.avatarWrap}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{initials}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={14} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.profileName}>{clientName}</Text>
              <Text style={styles.profileEmail}>{clientEmail}</Text>

              <View style={[styles.verifiedBadge, badgeBoxStyle]}>
                <Text style={[styles.verifiedBadgeText, badgeTextStyle]}>
                  {verificationLabel}
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>ACCOUNT</Text>

              <MenuItem
                title="Edit Personal Info"
                iconBg="#fff7ed"
                icon={<Feather name="edit-2" size={16} color="#f97316" />}
                onPress={() => {
                  const parentNavigation = navigation.getParent?.();
                  if (parentNavigation?.navigate) {
                    parentNavigation.navigate("PersonalInfo");
                    return;
                  }
                  navigation.navigate("PersonalInfo");
                }}
              />

              <View style={styles.divider} />

              <MenuItem
                title="Change Password"
                iconBg="#fff7ed"
                icon={<Feather name="lock" size={16} color="#f97316" />}
                onPress={() => navigation.navigate("ChangePassword")}
              />

              <View style={styles.divider} />

              <MenuItem
                title="Notifications"
                iconBg="#fff7ed"
                icon={
                  <Ionicons
                    name="notifications-outline"
                    size={17}
                    color="#f97316"
                  />
                }
                onPress={() => navigation.navigate("Notifications")}
              />

              {notificationsDisabled ? (
                <Text style={styles.notificationNotice}>
                  Notifications are disabled. You can enable them in device settings.
                </Text>
              ) : null}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>VERIFICATION</Text>

              <TouchableOpacity
                style={styles.verificationCard}
                activeOpacity={0.85}
                onPress={openVerification}
              >
                <View style={styles.verificationTopRow}>
                  <View style={styles.verificationIconWrap}>
                    <Feather name="shield" size={18} color="#f97316" />
                  </View>
                  <View style={styles.verificationTextWrap}>
                    <Text style={styles.verificationTitle}>Account Verification</Text>
                    <Text style={styles.verificationSubtitle}>
                      {getVerificationSubtitle()}
                    </Text>
                  </View>
                  <View style={[styles.smallBadge, badgeBoxStyle]}>
                    <Text style={[styles.smallBadgeText, badgeTextStyle]}>
                      {verificationLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.eligibilityPills}>
                  <View
                    style={[
                      styles.eligibilityPill,
                      eligibility.withDriver && styles.eligibilityPillActive,
                      withDriverBoxStyle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.eligibilityPillLabel,
                        eligibility.withDriver && styles.eligibilityPillLabelActive,
                        withDriverTextStyle,
                      ]}
                    >
                      With Driver
                    </Text>
                    <Text
                      style={[
                        styles.eligibilityPillValue,
                        eligibility.withDriver && styles.eligibilityPillValueActive,
                        withDriverTextStyle,
                      ]}
                    >
                      {eligibility.withDriverLabel || "Unavailable"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.eligibilityPill,
                      eligibility.selfDrive && styles.eligibilityPillActive,
                      selfDriveBoxStyle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.eligibilityPillLabel,
                        eligibility.selfDrive && styles.eligibilityPillLabelActive,
                        selfDriveTextStyle,
                      ]}
                    >
                      Self-Drive
                    </Text>
                    <Text
                      style={[
                        styles.eligibilityPillValue,
                        eligibility.selfDrive && styles.eligibilityPillValueActive,
                        selfDriveTextStyle,
                      ]}
                    >
                      {eligibility.selfDriveLabel || "Unavailable"}
                    </Text>
                  </View>
                </View>

                <View style={styles.verificationFooter}>
                  <Text style={styles.verificationAction}>{verificationAction}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#f97316" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Temporary push notification diagnostics. Hidden by default; enable with EXPO_PUBLIC_SHOW_PUSH_DEBUG=true if needed. */}
            {showPushDebug ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionLabel}>PUSH NOTIFICATION TEST</Text>
                <View style={styles.diagnosticBody}>
                  <Text style={styles.diagnosticNotice}>
                    Debug only. Do not share this token publicly.
                  </Text>
                  <DiagnosticRow
                    label="Permission"
                    value={pushDiagnostic?.permissionStatus || notificationPermissionStatus}
                  />
                  <DiagnosticRow
                    label="Physical device"
                    value={pushDiagnostic?.isPhysicalDevice ? "Yes" : "No"}
                  />
                  <DiagnosticRow
                    label="EAS project ID"
                    value={pushDiagnostic?.hasProjectId ? "Present" : "Missing"}
                  />
                  <DiagnosticRow
                    label="Project ID source"
                    value={pushDiagnostic?.projectIdSource || "Unknown"}
                  />
                  <DiagnosticRow
                    label="Token generated"
                    value={pushDebugToken ? "Yes" : "No"}
                  />
                  <DiagnosticRow
                    label="Stored token available"
                    value={pushDiagnostic?.hasStoredToken ? "Yes" : "No"}
                  />
                  <DiagnosticRow
                    label="Auth token"
                    value={pushDiagnostic?.hasAuthToken ? "Available" : "Missing"}
                  />
                  <DiagnosticRow
                    label="API URL"
                    value={pushDiagnostic?.apiUrl || "Loading..."}
                  />
                  <DiagnosticRow
                    label="Last attempt"
                    value={pushDiagnostic?.lastSyncAttemptTime || "None yet"}
                  />
                  <DiagnosticRow
                    label="Last sync result"
                    value={
                      pushDiagnostic?.lastSyncAttemptTime
                        ? pushDiagnostic?.lastSyncSuccess
                          ? "Success"
                          : "Failed"
                        : "Not attempted"
                    }
                  />
                  <DiagnosticRow
                    label="Backend reached"
                    value={pushDiagnostic?.lastSyncBackendReached ? "Yes" : "No"}
                  />
                  <DiagnosticRow
                    label="Status code"
                    value={
                      pushDiagnostic?.lastSyncStatus
                        ? String(pushDiagnostic.lastSyncStatus)
                        : "None"
                    }
                  />
                  <DiagnosticRow
                    label="Last error/result"
                    value={pushDiagnostic?.lastSyncMessage || "None"}
                  />
                  <DiagnosticRow
                    label="Token generation error"
                    value={pushDiagnostic?.tokenGenerationError || "None"}
                  />

                  {pushTokenResult ? (
                    <View
                      style={[
                        styles.diagnosticResult,
                        pushTokenResult.success
                          ? styles.diagnosticResultSuccess
                          : styles.diagnosticResultError,
                      ]}
                    >
                      <Text style={styles.diagnosticResultTitle}>
                        {pushTokenResult.success ? "Token generated" : "Token generation failed"}
                      </Text>
                      <Text style={styles.diagnosticResultText}>{pushTokenResult.message}</Text>
                    </View>
                  ) : null}

                  {pushDebugToken ? (
                    <View style={styles.debugTokenWrap}>
                      <Text style={styles.debugTokenLabel}>Expo Push Token</Text>
                      <Text selectable style={styles.debugTokenValue}>
                        {pushDebugToken}
                      </Text>
                      <TouchableOpacity
                        style={styles.diagnosticSecondaryButton}
                        activeOpacity={0.85}
                        onPress={handleCopyPushToken}
                      >
                        <Feather name="copy" size={16} color="#f97316" />
                        <Text style={styles.diagnosticSecondaryButtonText}>Copy Push Token</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.diagnosticButton,
                      generatingPushToken && styles.diagnosticButtonDisabled,
                    ]}
                    activeOpacity={0.85}
                    disabled={generatingPushToken}
                    onPress={handleGeneratePushToken}
                  >
                    {generatingPushToken ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="notifications-outline" size={17} color="#fff" />
                    )}
                    <Text style={styles.diagnosticButtonText}>
                      {generatingPushToken ? "Generating Token..." : "Generate / Show Expo Push Token"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.diagnosticButton,
                      styles.diagnosticSyncButton,
                      syncingPushToken && styles.diagnosticButtonDisabled,
                    ]}
                    activeOpacity={0.85}
                    disabled={syncingPushToken}
                    onPress={handleSyncPushToken}
                  >
                    {syncingPushToken ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="upload-cloud" size={17} color="#fff" />
                    )}
                    <Text style={styles.diagnosticButtonText}>
                      {syncingPushToken ? "Syncing Token..." : "Sync Token to Backend"}
                    </Text>
                  </TouchableOpacity>

                  {pushSyncResult ? (
                    <View
                      style={[
                        styles.diagnosticResult,
                        pushSyncResult.success
                          ? styles.diagnosticResultSuccess
                          : styles.diagnosticResultError,
                      ]}
                    >
                      <Text style={styles.diagnosticResultTitle}>
                        {pushSyncResult.success ? "Backend sync succeeded" : "Backend sync failed"}
                      </Text>
                      <Text style={styles.diagnosticResultText}>
                        Backend reached: {pushSyncResult.backendReached ? "Yes" : "No"} | Status:{" "}
                        {pushSyncResult.status || "None"}
                      </Text>
                      <Text style={styles.diagnosticResultText}>{pushSyncResult.message}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>ACTIVITY</Text>

              <MenuItem
                title="My Bookings"
                iconBg="#eff6ff"
                icon={<Feather name="calendar" size={16} color="#3b82f6" />}
                onPress={() => navigation.navigate("Bookings")}
              />
            </View>

            <TouchableOpacity
              style={styles.signOutButton}
              activeOpacity={0.85}
              onPress={confirmLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate("Home")}
            >
              <Ionicons name="home-outline" size={20} color="#94a3b8" />
              <Text style={styles.navText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate("Browse")}
            >
              <Ionicons name="car-outline" size={20} color="#94a3b8" />
              <Text style={styles.navText}>Browse</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.planButton}
              onPress={() => navigation.navigate("Plan")}
            >
              <MaterialCommunityIcons name="map-outline" size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => navigation.navigate("Bookings")}
            >
              <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
              <Text style={styles.navText}>Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="person" size={20} color="#f97316" />
              <Text style={[styles.navText, styles.navTextActive]}>Profile</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
