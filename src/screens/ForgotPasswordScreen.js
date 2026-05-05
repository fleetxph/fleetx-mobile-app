import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  Alert,
  KeyboardAvoidingView,
  SafeAreaView,
  ScrollView,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather } from "@expo/vector-icons";
import api from "../api/api";
import { styles } from "../styles/authStyle";
import LoadingOverlay from "../components/LoadingOverlay";
import {
  getPasswordChecks,
  getPasswordStrength,
  mapApiFieldError,
  normalizeEmail,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from "../utils/validation";

function RequirementText({ passed, children }) {
  return (
    <Text
      style={[
        styles.passwordGuideText,
        passed && styles.passwordGuideTextPassed,
      ]}
    >
      {passed ? "OK" : "-"} {children}
    </Text>
  );
}

export default function ForgotPasswordScreen({ navigation, route }) {
  const isChangePassword = route?.params?.mode === "changePassword";

  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [focusedField, setFocusedField] = useState("");

  const passwordChecks = useMemo(() => getPasswordChecks(newPassword), [newPassword]);
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

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

  const handleSendCode = async () => {
    if (loading) return;
    setMsg("");
    Keyboard.dismiss();
    const emailError = validateEmail(email).replace("Email is required.", "Email address is required.");
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    try {
      setLoading(true);
      const cleanEmail = normalizeEmail(email);

      const res = await api.post("/client/forgot-password/request-code", {
        email: cleanEmail,
      });

      navigation.navigate("ForgotPasswordSent", {
        email: cleanEmail,
        message:
          res.data?.message ||
          "If an account exists for this email, a reset code has been sent.",
      });
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Unable to send reset code. Please try again.";
      const mappedError = mapApiFieldError(message, "forgotPassword");
      if (mappedError?.field) {
        setFieldErrors((prev) => ({ ...prev, [mappedError.field]: mappedError.message }));
        setMsg("");
      } else {
        setMsg(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (loading) return;
    setMsg("");
    Keyboard.dismiss();

    const nextErrors = {
      currentPassword: !currentPassword ? "Current password is required." : "",
      newPassword: validatePassword(newPassword, {
        fieldLabel: "New password",
        compareTo: currentPassword,
        disallowSameAsOld: true,
      }),
      confirmPassword: validateConfirmPassword(newPassword, confirmPassword, {
        emptyMessage: "Please confirm your new password.",
      }),
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      setLoading(true);
      const storedEmail =
        Platform.OS === "web"
          ? window.localStorage.getItem("clientEmail") || ""
          : (await AsyncStorage.getItem("clientEmail")) || "";
      const cleanStoredEmail = normalizeEmail(storedEmail);

      if (!cleanStoredEmail) {
        setMsg("We could not find your account email. Please use Forgot Password instead.");
        return;
      }

      const res = await api.post("/client/forgot-password/request-code", {
        email: cleanStoredEmail,
      });

      Alert.alert(
        "Verification Required",
        res.data?.message || "A reset code was sent to your email.",
        [
          {
            text: "Continue",
            onPress: () =>
              navigation.navigate("ForgotPasswordSent", {
                email: cleanStoredEmail,
                message: "Use the code from your email to finish changing your password.",
              }),
          },
        ]
      );
    } catch (err) {
      setMsg(err?.response?.data?.message || err.message || "Failed to start password reset.");
    } finally {
      setLoading(false);
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
          <View style={[styles.authTopSection, styles.authTopSectionCompact]}>
            <View style={styles.brandArea}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require("../../assets/logo.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandName}>FleetDrive</Text>
              <Text style={styles.brandTagline}>Premium transport and rental booking</Text>
            </View>

            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>CAPT FleetX</Text>
              <Text style={styles.heroTitle}>
                {isChangePassword ? "Change Password" : "Forgot Password?"}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isChangePassword
                  ? "Secure your account with a verified password update."
                  : "We'll send a secure reset code to your email address."}
              </Text>
            </View>
          </View>

          <View style={styles.cardWrap}>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={20} color="#0B1633" />
              </TouchableOpacity>

              <View style={styles.otpIconWrap}>
                <Feather name="lock" size={28} color="#F97316" />
              </View>

              <Text style={styles.title}>
                {isChangePassword ? "Change Password" : "Reset Access"}
              </Text>

              <Text style={styles.subtitle}>
                {isChangePassword
                  ? "We will send a verification code to your account email before updating your password."
                  : "Enter your email below and we'll send your reset code."}
              </Text>

              {!!msg && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{msg}</Text>
                </View>
              )}

              {isChangePassword ? (
                <>
                  <Text style={styles.label}>Current Password</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "currentPassword" && styles.inputWrapperFocused,
                      fieldErrors.currentPassword && styles.inputWrapperError,
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
                      placeholder="Enter current password"
                      placeholderTextColor="#98A2B3"
                      value={currentPassword}
                      onChangeText={(text) => updateField("currentPassword", text, setCurrentPassword)}
                      onFocus={() => setFocusedField("currentPassword")}
                      onBlur={() => setFocusedField("")}
                      secureTextEntry
                    />
                  </View>
                  {!!fieldErrors.currentPassword && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.currentPassword}</Text>
                  )}

                  <Text style={styles.label}>New Password</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "newPassword" && styles.inputWrapperFocused,
                      fieldErrors.newPassword && styles.inputWrapperError,
                    ]}
                  >
                    <Feather
                      name="key"
                      size={18}
                      color="#98A2B3"
                      style={styles.leftIcon}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Enter new password"
                      placeholderTextColor="#98A2B3"
                      value={newPassword}
                      onChangeText={(text) => updateField("newPassword", text.slice(0, 64), setNewPassword)}
                      maxLength={64}
                      onFocus={() => setFocusedField("newPassword")}
                      onBlur={() => setFocusedField("")}
                      secureTextEntry
                    />
                  </View>
                  {!!fieldErrors.newPassword && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.newPassword}</Text>
                  )}

                  <View style={styles.passwordStrengthBox}>
                    <View style={styles.passwordStrengthTop}>
                      <Text style={styles.passwordStrengthLabel}>
                        Password Strength
                      </Text>
                      <Text
                        style={[
                          styles.passwordStrengthValue,
                          { color: passwordStrength.color },
                        ]}
                      >
                        {passwordStrength.label}
                      </Text>
                    </View>

                    <View style={styles.passwordStrengthTrack}>
                      <View
                        style={[
                          styles.passwordStrengthFill,
                          {
                            width: passwordStrength.width,
                            backgroundColor: passwordStrength.color,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.passwordGuideBox}>
                    <Text style={styles.passwordGuideTitle}>
                      Password Requirements
                    </Text>

                    <RequirementText passed={passwordChecks.minLength}>
                      At least 8 characters
                    </RequirementText>

                    <RequirementText passed={passwordChecks.maxLength}>
                      Maximum 64 characters
                    </RequirementText>

                    <RequirementText passed={passwordChecks.uppercase}>
                      At least one uppercase letter
                    </RequirementText>

                    <RequirementText passed={passwordChecks.lowercase}>
                      At least one lowercase letter
                    </RequirementText>

                    <RequirementText passed={passwordChecks.number}>
                      At least one number
                    </RequirementText>

                    <RequirementText passed={passwordChecks.special}>
                      At least one special character
                    </RequirementText>
                  </View>

                  <Text style={styles.label}>Confirm New Password</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "confirmPassword" && styles.inputWrapperFocused,
                      fieldErrors.confirmPassword && styles.inputWrapperError,
                    ]}
                  >
                    <Feather
                      name="check-circle"
                      size={18}
                      color="#98A2B3"
                      style={styles.leftIcon}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Confirm new password"
                      placeholderTextColor="#98A2B3"
                      value={confirmPassword}
                      onChangeText={(text) =>
                        updateField("confirmPassword", text.slice(0, 64), setConfirmPassword)
                      }
                      maxLength={64}
                      onFocus={() => setFocusedField("confirmPassword")}
                      onBlur={() => setFocusedField("")}
                      secureTextEntry
                    />
                  </View>
                  {!!fieldErrors.confirmPassword && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
                  )}

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleChangePassword}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        loading && styles.buttonTextDisabled,
                      ]}
                    >
                      {loading ? "Sending reset code..." : "Save Password"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Email Address</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "email" && styles.inputWrapperFocused,
                      fieldErrors.email && styles.inputWrapperError,
                    ]}
                  >
                    <Feather
                      name="mail"
                      size={18}
                      color="#98A2B3"
                      style={styles.leftIcon}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="you@email.com"
                      placeholderTextColor="#98A2B3"
                      value={email}
                      onChangeText={(text) => updateField("email", text, setEmail)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField("")}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  {!!fieldErrors.email && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
                  )}

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSendCode}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        loading && styles.buttonTextDisabled,
                      ]}
                    >
                      {loading ? "Sending reset code..." : "Send Code"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.bottomRow}>
                    <Text style={styles.bottomText}>Remember your password? </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("ClientLogin")}
                    >
                      <Text style={styles.registerText}>Back to Login</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        <LoadingOverlay
          visible={loading}
          text={
            isChangePassword ? "Updating password..." : "Sending reset code..."
          }
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
