import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from "react-native";
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
  validatePassword,
} from "../utils/validation";

function Requirement({ passed, text }) {
  return (
    <Text
      style={[
        styles.passwordRuleItem,
        passed && { color: "#16a34a", fontWeight: "700" },
      ]}
    >
      {passed ? "OK" : "-"} {text}
    </Text>
  );
}

export default function ResetPasswordScreen({ route, navigation }) {
  const email = route?.params?.email || "";
  const otp = route?.params?.otp || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleResetPassword = async () => {
    if (loading) return;
    setMsg("");
    Keyboard.dismiss();
    const nextErrors = {
      newPassword: validatePassword(newPassword, { fieldLabel: "Password" }).replace("Password is required.", "New password is required."),
      confirmPassword: validateConfirmPassword(newPassword, confirmPassword, {
        emptyMessage: "Please confirm your new password.",
      }),
      otp: !String(otp || "").trim() ? "Reset session expired. Please request a new reset code." : "",
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      setLoading(true);

      await api.post("/client/forgot-password/reset", {
        email: normalizeEmail(email),
        otp,
        newPassword,
        confirmPassword,
      });

      navigation.replace("ResetPasswordSuccess");
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Unable to update password. Please try again.";
      const mappedError = mapApiFieldError(message, "reset");
      if (mappedError?.field) {
        setFieldErrors((prev) => ({ ...prev, [mappedError.field]: mappedError.message }));
      } else {
        setMsg(message);
      }
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

          <Text style={styles.title}>Create new password</Text>

          <Text style={styles.subtitleCenter}>
            Choose a strong password for your account.
          </Text>

          {!!msg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{msg}</Text>
            </View>
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
              name="lock"
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
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedField("newPassword")}
              onBlur={() => setFocusedField("")}
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
          {!!fieldErrors.newPassword && (
            <Text style={styles.fieldErrorText}>{fieldErrors.newPassword}</Text>
          )}

          {!!newPassword && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBarBg}>
                <View
                  style={[
                    styles.strengthBarFill,
                    {
                      width: passwordStrength.width,
                      backgroundColor: passwordStrength.color,
                    },
                  ]}
                />
              </View>

              <Text
                style={[styles.strengthText, { color: passwordStrength.color }]}
              >
                {passwordStrength.label}
              </Text>
            </View>
          )}

          <Text style={styles.label}>Confirm Password</Text>

          <View
            style={[
              styles.inputWrapper,
              focusedField === "confirmPassword" && styles.inputWrapperFocused,
              fieldErrors.confirmPassword && styles.inputWrapperError,
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
              placeholder="Confirm new password"
              placeholderTextColor="#98A2B3"
              value={confirmPassword}
              onChangeText={(text) =>
                updateField("confirmPassword", text.slice(0, 64), setConfirmPassword)
              }
              maxLength={64}
              secureTextEntry={!showConfirmPassword}
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField("")}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Feather
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={18}
                color="#98A2B3"
              />
            </TouchableOpacity>
          </View>
          {!!fieldErrors.confirmPassword && (
            <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
          )}
          {!!fieldErrors.otp && (
            <Text style={styles.fieldErrorText}>{fieldErrors.otp}</Text>
          )}

          <View style={styles.passwordRulesCard}>
            <Text style={styles.passwordRulesTitle}>Password Requirements</Text>

            <Requirement
              passed={passwordChecks.minLength}
              text="At least 8 characters"
            />

            <Requirement
              passed={passwordChecks.maxLength}
              text="Maximum 64 characters"
            />

            <Requirement
              passed={passwordChecks.uppercase}
              text="At least one uppercase letter"
            />

            <Requirement
              passed={passwordChecks.lowercase}
              text="At least one lowercase letter"
            />

            <Requirement
              passed={passwordChecks.number}
              text="At least one number"
            />

            <Requirement
              passed={passwordChecks.special}
              text="At least one special character"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text
              style={[
                styles.buttonText,
                loading && styles.buttonTextDisabled,
              ]}
            >
              {loading ? "Updating password..." : "Reset Password"}
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>

        <LoadingOverlay visible={loading} text="Updating your password..." />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
