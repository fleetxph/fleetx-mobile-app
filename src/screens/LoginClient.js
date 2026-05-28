import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getFriendlyApiErrorMessage } from "../api/api";
import { loginClient } from "../api/clientApi";
import { styles } from "../styles/authStyle";
import LoadingOverlay from "../components/LoadingOverlay";
import { useAuth } from "../context/AuthContext";
import {
  clearStoredBookingIntent,
  getBookingIntentMeta,
  getStoredBookingIntent,
  PENDING_GUEST_BOOKING_KEY,
} from "../utils/bookingState";
import {
  mapApiFieldError,
  normalizeEmail,
  normalizeUsername,
  validateLoginIdentifier,
} from "../utils/validation";

function buildGuestResumeTarget(pending) {
  if (!pending) return null;

  const wizardParams = {
    vehicle: pending.selectedVehicle || null,
    selectedVehicle: pending.selectedVehicle || null,
    vehicleId: pending.vehicleId || pending.selectedVehicle?._id || pending.selectedVehicle?.id || "",
    entryMode: pending.entryMode || "",
    mode: pending.mode || "",
    pickupDate: pending.pickupDate || "",
    returnDate: pending.returnDate || "",
    pricingPreview: pending.pricingPreview || null,
    paymentMethod: pending.paymentMethod || "",
    paymentOption: pending.paymentOption || "",
    selectedPaymentMethodId: pending.selectedPaymentMethodId || "",
    tripData: pending.tripData || {},
    bookingDraft:
      pending.currentStep === "review" || pending.currentStep === 4
        ? { currentStep: "review" }
        : null,
  };

  const isDirectBooking =
    pending.entryMode === "directVehicle" ||
    pending.entryMode === "direct" ||
    pending.mode === "direct";

  if (isDirectBooking) {
    return {
      screen: "Browse",
      params: {
        screen: "BookingWizard",
        params: wizardParams,
      },
    };
  }

  return {
    screen: "Plan",
    params: wizardParams,
  };
}

function getFriendlyLoginMessage(error) {
  if (error?.authColdStartRetryExhausted) {
    return "Server is taking longer than expected. Please try again.";
  }

  if (!error?.response) {
    return getFriendlyApiErrorMessage(
      error,
      "Connection problem. Please check your internet and try again."
    );
  }

  const status = error.response?.status;
  const code = String(error.response?.data?.code || "").toUpperCase();
  const rawMessage = String(error.response?.data?.message || "").trim();
  const lowerMessage = rawMessage.toLowerCase();

  if (code === "EMAIL_VERIFICATION_REQUIRED" || lowerMessage.includes("verify") && lowerMessage.includes("email")) {
    return "Email verification required";
  }

  if (
    code.includes("PENDING") ||
    lowerMessage.includes("pending verification") ||
    lowerMessage.includes("under review")
  ) {
    return "Account pending verification";
  }

  if (
    code.includes("DISABLED") ||
    code.includes("DEACTIVATED") ||
    lowerMessage.includes("disabled") ||
    lowerMessage.includes("deactivated") ||
    lowerMessage.includes("blocked")
  ) {
    return "Account disabled";
  }

  if (status === 400 || status === 401) {
    return "Invalid email or password";
  }

  if (status === 403) {
    return "Server rejected login";
  }

  return getFriendlyApiErrorMessage(
    error,
    rawMessage || "Unable to sign in right now. Please try again."
  );
}

export default function LoginClient({ navigation, route }) {
  const { saveSession } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wakingServer, setWakingServer] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  useEffect(() => {
    if (route?.params?.sessionExpired) {
      setMsg("Your session expired. Please log in again.");
      navigation.setParams?.({ sessionExpired: undefined });
    }
  }, [navigation, route?.params?.sessionExpired]);

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: "" };
    });
  };

  const updateField = (field, value, setter) => {
    setter(value);
    clearFieldError(field);
    setMsg("");
  };

  const validateForm = () => {
    const nextErrors = {
      login: validateLoginIdentifier(login),
      password: !password
        ? "Password is required."
        : password.length < 8
        ? "Password must be at least 8 characters."
        : "",
    };

    setFieldErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleLogin = async () => {
    if (loading) return;
    setMsg("");
    Keyboard.dismiss();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setWakingServer(false);
      const cleanLogin = login.includes("@")
        ? normalizeEmail(login)
        : normalizeUsername(login).toLowerCase();

      const res = await loginClient({
        email: cleanLogin,
        login: cleanLogin,
        password,
      }, {
        onRetry: () => {
          setWakingServer(true);
          setMsg("Server is waking up. Please wait...");
        },
      });

      const token = res?.token || "";
      const user = res?.user || {};
      const name = user?.name || "";
      const userEmail = user?.email || "";

      await saveSession({
        token,
        user: {
          ...user,
          name: user?.name || name,
          email: user?.email || userEmail,
        },
      });

      const hasPendingBookingIntent = Boolean(route?.params?.resumeGuestBooking);
      const pendingBookingKey = route?.params?.pendingBookingKey || PENDING_GUEST_BOOKING_KEY;
      const pendingGuestBooking = hasPendingBookingIntent
        ? await getStoredBookingIntent(pendingBookingKey)
        : null;
      const pendingBookingMeta = getBookingIntentMeta(pendingGuestBooking);
      const resumeTarget = hasPendingBookingIntent
        ? buildGuestResumeTarget(pendingGuestBooking)
        : null;

      if (__DEV__) {
        console.log("[BookingState][restore]", {
          hasSelectedVehicle: pendingBookingMeta.hasSelectedVehicle,
          hasDraft: pendingBookingMeta.hasDraft,
          openedWizard: Boolean(resumeTarget),
          reason: hasPendingBookingIntent ? "explicit-login-resume" : "normal-login",
        });
      }

      if (resumeTarget) {
        await clearStoredBookingIntent({
          reason: "login-resume-consumed",
          key: pendingBookingKey,
        });
        if (__DEV__) {
          console.log("[Navigation][postLogin]", {
            targetRoute: "BookingWizard",
            hadPendingBookingIntent: true,
          });
        }
        navigation.reset({
          index: 0,
          routes: [{ name: "MainApp", params: resumeTarget }],
        });
        return;
      }

      await clearStoredBookingIntent({
        reason: hasPendingBookingIntent ? "login-resume-missing-intent" : "login-clear-stale-draft",
        key: pendingBookingKey,
      });
      if (__DEV__) {
        console.log("[Navigation][postLogin]", {
          targetRoute: "Home",
          hadPendingBookingIntent: hasPendingBookingIntent,
        });
      }
      navigation.reset({
        index: 0,
        routes: [{ name: "MainApp", params: { screen: "Home" } }],
      });
    } catch (err) {
      const message = getFriendlyLoginMessage(err);
      const mappedError = mapApiFieldError(message, "login");

      if (mappedError?.field) {
        setFieldErrors((prev) => ({ ...prev, [mappedError.field]: mappedError.message }));
        setMsg("");
      } else {
        setMsg(message);
      }
    } finally {
      setLoading(false);
      setWakingServer(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.container}>
        <View pointerEvents="none" style={styles.topGlow} />
        <View pointerEvents="none" style={styles.bottomCurve} />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={styles.scrollContent}
        >
            <View style={styles.authTopSection}>
              <View style={styles.brandArea}>
                <View style={styles.logoWrapper}>
                  <Image
                    source={require("../../assets/logo.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
                
              </View>

              <View style={styles.heroTextBlock}>
                <Text style={styles.heroEyebrow}>CAPT FleetX</Text>
                <Text style={styles.heroTitle}>Welcome Back!</Text>
                <Text style={styles.heroSubtitle}>
                  Sign in to manage bookings, view trip updates, and continue your
                  next ride with ease.
                </Text>
              </View>
            </View>

            <View style={styles.cardWrap}>
              <View style={styles.card}>
                <View style={styles.authTabs}>
                  <TouchableOpacity
                    style={[styles.authTab, styles.authTabActive]}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.authTabText, styles.authTabTextActive]}>
                      Log In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.authTab}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("RegisterClient")}
                  >
                    <Text style={styles.authTabText}>Sign Up</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.title}>Welcome Back!</Text>
                <Text style={styles.subtitle}>
                  Enter your details to access your FleetDrive account.
                </Text>

                {!!msg && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{msg}</Text>
                  </View>
                )}

                <Text style={styles.label}>Email / Username</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "login" && styles.inputWrapperFocused,
                    fieldErrors.login && styles.inputWrapperError,
                  ]}
                >
                  <Feather
                    name="user"
                    size={18}
                    color="#98A2B3"
                    style={styles.leftIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter email or username"
                    placeholderTextColor="#98A2B3"
                    value={login}
                    onChangeText={(text) => updateField("login", text, setLogin)}
                    onFocus={() => setFocusedField("login")}
                    onBlur={() => setFocusedField("")}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
                {!!fieldErrors.login && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.login}</Text>
                )}

                <Text style={styles.label}>Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "password" && styles.inputWrapperFocused,
                    fieldErrors.password && styles.inputWrapperError,
                  ]}
                >
                  <Feather
                    name="lock"
                    size={18}
                    color="#98A2B3"
                    style={styles.leftIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter your password"
                    placeholderTextColor="#98A2B3"
                    value={password}
                    onChangeText={(text) => updateField("password", text, setPassword)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField("")}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#98A2B3"
                    />
                  </TouchableOpacity>
                </View>
                {!!fieldErrors.password && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
                )}

                <TouchableOpacity
                  style={styles.forgotPasswordWrap}
                  onPress={() => navigation.navigate("ForgotPassword")}
                >
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      loading && styles.buttonTextDisabled,
                    ]}
                    >
                    {loading ? "Signing in..." : "Log In"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.bottomRow}>
                  <Text style={styles.bottomText}>Don&apos;t have an account? </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("RegisterClient")}
                  >
                    <Text style={styles.registerText}>Sign Up</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.trustText}>
                  Secure login - Verified bookings - Real-time updates
                </Text>
              </View>
            </View>
        </ScrollView>

        <LoadingOverlay
          visible={loading}
          text={wakingServer ? "Server is waking up. Please wait..." : "Signing you in..."}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
