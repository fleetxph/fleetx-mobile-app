import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
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
  normalizeExtension,
  normalizeMiddleInitial,
  normalizeName,
  normalizeUsername,
  validateConfirmPassword,
  validateEmail,
  validateExtension,
  validateMiddleInitial,
  validateName,
  validatePassword,
  validateUsername,
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

export default function RegisterClient({ navigation }) {
  const scrollRef = useRef(null);

  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [extension, setExtension] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 250);
  };

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

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
      firstName: validateName(firstName, "First name"),
      middleInitial: validateMiddleInitial(middleInitial),
      lastName: validateName(lastName, "Last name"),
      extension: validateExtension(extension),
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };

    setFieldErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };

  const handleRegister = async () => {
    if (loading) return;
    setMsg("");
    Keyboard.dismiss();
    if (!validateForm()) return;

    const cleanFirstName = normalizeName(firstName);
    const cleanMiddleInitial = normalizeMiddleInitial(middleInitial);
    const cleanLastName = normalizeName(lastName);
    const cleanExtension = normalizeExtension(extension);
    const cleanUsername = normalizeUsername(username).toLowerCase();
    const cleanEmail = normalizeEmail(email);

    try {
      setLoading(true);

      const res = await api.post("/client/register", {
        firstName: cleanFirstName,
        middleInitial: cleanMiddleInitial,
        lastName: cleanLastName,
        extension: cleanExtension,
        username: cleanUsername,
        email: cleanEmail,
        password,
      });

      navigation.navigate("ClientOTP", {
        email: res.data?.email || cleanEmail,
        message: "Account created. Please check your email for verification.",
      });
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Unable to create account right now. Please try again.";
      const mappedError = mapApiFieldError(message, "register");

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.container}>
        <View pointerEvents="none" style={styles.topGlow} />
        <View pointerEvents="none" style={styles.bottomCurve} />
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={styles.scrollContentTop}
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
                <Text style={styles.heroTitle}>Create Your Account</Text>
                <Text style={styles.heroSubtitle}>
                  Join FleetDrive to book vehicles, manage reservations, and stay
                  ready for every trip.
                </Text>
              </View>
            </View>

            <View style={styles.cardWrap}>
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.backButton}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={20} color="#0B1633" />
                </TouchableOpacity>

                <View style={styles.authTabs}>
                  <TouchableOpacity
                    style={styles.authTab}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("ClientLogin")}
                  >
                    <Text style={styles.authTabText}>Log In</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.authTab, styles.authTabActive]}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.authTabText, styles.authTabTextActive]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.title}>Sign Up</Text>
                <Text style={styles.subtitle}>
                  Fill in your details to create your FleetDrive account.
                </Text>

                {!!msg && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{msg}</Text>
                  </View>
                )}

                <Text style={styles.label}>First Name</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "firstName" && styles.inputWrapperFocused,
                    fieldErrors.firstName && styles.inputWrapperError,
                  ]}
                >
                  <Feather name="user" size={18} color="#98A2B3" style={styles.leftIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter first name"
                    placeholderTextColor="#98A2B3"
                    value={firstName}
                    onChangeText={(text) => updateField("firstName", text, setFirstName)}
                    onFocus={() => setFocusedField("firstName")}
                    onBlur={() => setFocusedField("")}
                    returnKeyType="next"
                  />
                </View>
                {!!fieldErrors.firstName && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.firstName}</Text>
                )}

                <View style={styles.inlineFieldRow}>
                  <View style={styles.inlineFieldColumnNarrow}>
                    <Text style={styles.label}>Middle Initial</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === "middleInitial" && styles.inputWrapperFocused,
                        fieldErrors.middleInitial && styles.inputWrapperError,
                      ]}
                    >
                      <Feather name="type" size={18} color="#98A2B3" style={styles.leftIcon} />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="M"
                        placeholderTextColor="#98A2B3"
                        value={middleInitial}
                        onChangeText={(text) =>
                          updateField("middleInitial", text.toUpperCase().slice(0, 2), setMiddleInitial)
                        }
                        onFocus={() => setFocusedField("middleInitial")}
                        onBlur={() => setFocusedField("")}
                        autoCapitalize="characters"
                        maxLength={2}
                        returnKeyType="next"
                      />
                    </View>
                    {!!fieldErrors.middleInitial && (
                      <Text style={styles.fieldErrorText}>{fieldErrors.middleInitial}</Text>
                    )}
                  </View>

                  <View style={styles.inlineFieldColumn}>
                    <Text style={styles.label}>Extension</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === "extension" && styles.inputWrapperFocused,
                        fieldErrors.extension && styles.inputWrapperError,
                      ]}
                    >
                      <Feather name="bookmark" size={18} color="#98A2B3" style={styles.leftIcon} />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Jr., Sr., III"
                        placeholderTextColor="#98A2B3"
                        value={extension}
                        onChangeText={(text) => updateField("extension", text, setExtension)}
                        onFocus={() => setFocusedField("extension")}
                        onBlur={() => setFocusedField("")}
                        autoCapitalize="characters"
                        returnKeyType="next"
                      />
                    </View>
                    {!!fieldErrors.extension && (
                      <Text style={styles.fieldErrorText}>{fieldErrors.extension}</Text>
                    )}
                  </View>
                </View>

                <Text style={styles.label}>Last Name</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "lastName" && styles.inputWrapperFocused,
                    fieldErrors.lastName && styles.inputWrapperError,
                  ]}
                >
                  <Feather name="user" size={18} color="#98A2B3" style={styles.leftIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter last name"
                    placeholderTextColor="#98A2B3"
                    value={lastName}
                    onChangeText={(text) => updateField("lastName", text, setLastName)}
                    onFocus={() => setFocusedField("lastName")}
                    onBlur={() => setFocusedField("")}
                    returnKeyType="next"
                  />
                </View>
                {!!fieldErrors.lastName && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.lastName}</Text>
                )}

                <Text style={styles.label}>Username</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "username" && styles.inputWrapperFocused,
                    fieldErrors.username && styles.inputWrapperError,
                  ]}
                >
                  <Feather name="at-sign" size={18} color="#98A2B3" style={styles.leftIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Choose a username"
                    placeholderTextColor="#98A2B3"
                    value={username}
                    onChangeText={(text) => updateField("username", text, setUsername)}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField("")}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
                {!!fieldErrors.username && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.username}</Text>
                )}

                <Text style={styles.label}>Email Address</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "email" && styles.inputWrapperFocused,
                    fieldErrors.email && styles.inputWrapperError,
                  ]}
                >
                  <Feather name="mail" size={18} color="#98A2B3" style={styles.leftIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter Email"
                    placeholderTextColor="#98A2B3"
                    value={email}
                    onChangeText={(text) => updateField("email", text, setEmail)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField("")}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>
                {!!fieldErrors.email && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
                )}

                <Text style={styles.label}>Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === "password" && styles.inputWrapperFocused,
                    fieldErrors.password && styles.inputWrapperError,
                  ]}
                >
                  <Feather name="lock" size={18} color="#98A2B3" style={styles.leftIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Create a password"
                    placeholderTextColor="#98A2B3"
                    value={password}
                    onChangeText={(text) => updateField("password", text.slice(0, 64), setPassword)}
                    maxLength={64}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    onFocus={() => {
                      setFocusedField("password");
                      scrollToBottom();
                    }}
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
                {!!fieldErrors.password && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
                )}

                {!!password && (
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

                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
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
                  <Feather name="lock" size={18} color="#98A2B3" style={styles.leftIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Re-enter password"
                    placeholderTextColor="#98A2B3"
                    value={confirmPassword}
                    onChangeText={(text) =>
                      updateField("confirmPassword", text.slice(0, 64), setConfirmPassword)
                    }
                    maxLength={64}
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    onFocus={() => {
                      setFocusedField("confirmPassword");
                      scrollToBottom();
                    }}
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
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      loading && styles.buttonTextDisabled,
                    ]}
                    >
                    {loading ? "Creating account..." : "Sign Up"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.bottomRow}>
                  <Text style={styles.bottomText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate("ClientLogin")}>
                    <Text style={styles.registerText}>Log In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
        </ScrollView>

        <LoadingOverlay visible={loading} text="Creating your account..." />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
