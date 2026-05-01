import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { changeClientPassword } from "../api/clientApi";
import { clearClientSession, isUnauthorizedError } from "../api/api";
import { authColors, styles as authStyles } from "../styles/authStyle";

const INITIAL_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function getPasswordErrors(form) {
  const errors = {};
  const currentPassword = String(form.currentPassword || "");
  const newPassword = String(form.newPassword || "");
  const confirmPassword = String(form.confirmPassword || "");

  if (!currentPassword.trim()) {
    errors.currentPassword = "Current password is required.";
  }

  if (!newPassword) {
    errors.newPassword = "New password is required.";
  } else if (newPassword.length < 8) {
    errors.newPassword = "New password must be at least 8 characters.";
  } else if (!/[A-Z]/.test(newPassword)) {
    errors.newPassword = "New password must include an uppercase letter.";
  } else if (!/[a-z]/.test(newPassword)) {
    errors.newPassword = "New password must include a lowercase letter.";
  } else if (!/\d/.test(newPassword)) {
    errors.newPassword = "New password must include a number.";
  } else if (newPassword === currentPassword) {
    errors.newPassword = "New password must be different from current password.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm new password is required.";
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = "New password and confirmation must match.";
  }

  return errors;
}

export default function ChangePasswordScreen({ navigation }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState("");
  const [visible, setVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      length: form.newPassword.length >= 8,
      uppercase: /[A-Z]/.test(form.newPassword),
      lowercase: /[a-z]/.test(form.newPassword),
      number: /\d/.test(form.newPassword),
      different:
        Boolean(form.currentPassword) &&
        Boolean(form.newPassword) &&
        form.currentPassword !== form.newPassword,
    }),
    [form.currentPassword, form.newPassword]
  );

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleAuthExpired = async () => {
    await clearClientSession();
    Alert.alert("Session expired", "Please sign in again to continue.", [
      {
        text: "Sign In",
        onPress: () =>
          navigation.reset({
            index: 0,
            routes: [{ name: "ClientLogin" }],
          }),
      },
    ]);
  };

  const handleSubmit = async () => {
    const nextErrors = getPasswordErrors(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);
      await changeClientPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setForm(INITIAL_FORM);
      Alert.alert("Password updated", "Your password has been updated successfully.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await handleAuthExpired();
        return;
      }

      const message =
        err?.response?.data?.message ||
        "Could not update your password. Please check your current password and try again.";
      Alert.alert("Update failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderPasswordField = (key, label, placeholder) => {
    const hasError = Boolean(errors[key]);

    return (
      <View style={localStyles.fieldBlock}>
        <Text style={authStyles.label}>{label}</Text>
        <View
          style={[
            authStyles.inputWrapper,
            focusedField === key && authStyles.inputWrapperFocused,
            hasError && authStyles.inputWrapperError,
            localStyles.inputWrapper,
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={focusedField === key ? authColors.accent : authColors.muted}
            style={authStyles.leftIcon}
          />
          <TextInput
            style={authStyles.inputWithIcon}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={form[key]}
            secureTextEntry={!visible[key]}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            onFocus={() => setFocusedField(key)}
            onBlur={() => setFocusedField("")}
            onChangeText={(value) => updateField(key, value)}
            returnKeyType="next"
          />
          <TouchableOpacity
            style={localStyles.eyeButton}
            onPress={() => setVisible((prev) => ({ ...prev, [key]: !prev[key] }))}
            activeOpacity={0.75}
          >
            <Ionicons
              name={visible[key] ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={authColors.muted}
            />
          </TouchableOpacity>
        </View>
        {hasError ? <Text style={localStyles.fieldError}>{errors[key]}</Text> : null}
      </View>
    );
  };

  const Requirement = ({ passed, children }) => (
    <Text
      style={[
        authStyles.passwordGuideText,
        passed && authStyles.passwordGuideTextPassed,
      ]}
    >
      {passed ? "OK" : "-"} {children}
    </Text>
  );

  return (
    <SafeAreaView style={authStyles.container}>
      <View style={authStyles.topGlow} />
      <View style={authStyles.bottomCurve} />

      <KeyboardAvoidingView
        style={localStyles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={authStyles.scrollContentTop}
        >
          <TouchableOpacity
            style={authStyles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={authColors.primary} />
          </TouchableOpacity>

          <View style={authStyles.brandArea}>
            <View style={authStyles.logoWrapper}>
              <Ionicons name="key-outline" size={34} color={authColors.accent} />
            </View>
            <Text style={authStyles.brandName}>FleetDrive</Text>
            <Text style={authStyles.brandTagline}>
              Secure account access
            </Text>
          </View>

          <View style={[authStyles.card, authStyles.compactCard]}>
            <Text style={authStyles.title}>Change password</Text>
            <Text style={authStyles.subtitle}>
              Update your password using your current account password.
            </Text>

            {renderPasswordField(
              "currentPassword",
              "Current Password",
              "Enter current password"
            )}
            {renderPasswordField("newPassword", "New Password", "Enter new password")}
            {renderPasswordField(
              "confirmPassword",
              "Confirm New Password",
              "Re-enter new password"
            )}

            <View style={authStyles.passwordGuideBox}>
              <Text style={authStyles.passwordGuideTitle}>
                Password Requirements
              </Text>
              <Requirement passed={passwordChecks.length}>
                At least 8 characters
              </Requirement>
              <Requirement passed={passwordChecks.uppercase}>
                One uppercase letter
              </Requirement>
              <Requirement passed={passwordChecks.lowercase}>
                One lowercase letter
              </Requirement>
              <Requirement passed={passwordChecks.number}>
                One number
              </Requirement>
              <Requirement passed={passwordChecks.different}>
                Different from current password
              </Requirement>
            </View>

            <TouchableOpacity
              style={[
                authStyles.button,
                submitting && authStyles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={authColors.white} />
              ) : (
                <Text style={authStyles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  fieldBlock: {
    marginBottom: 2,
  },
  inputWrapper: {
    marginBottom: 6,
  },
  eyeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  fieldError: {
    color: authColors.danger,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
    marginLeft: 2,
  },
});
