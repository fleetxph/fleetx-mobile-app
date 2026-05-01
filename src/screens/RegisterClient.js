import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
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

export default function RegisterClient({ navigation }) {
  const scrollRef = useRef(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 250);
  };

  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 10,
      maxLength: password.length <= 64 && password.length > 0,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
    };
  }, [password]);

  const passwordStrength = useMemo(() => {
    const score = Object.values(passwordChecks).filter(Boolean).length;

    if (!password) return { label: "", width: "0%", color: "#D0D5DD" };
    if (score <= 1) return { label: "Weak", width: "33%", color: "#EF4444" };
    if (score <= 3) return { label: "Medium", width: "66%", color: "#F59E0B" };

    return { label: "Strong", width: "100%", color: "#22C55E" };
  }, [password, passwordChecks]);

  const Requirement = ({ passed, text }) => (
    <Text
      style={[
        styles.passwordRuleItem,
        passed && { color: "#16a34a", fontWeight: "700" },
      ]}
    >
      {passed ? "OK" : "-"} {text}
    </Text>
  );

  const handleRegister = async () => {
    setMsg("");
    Keyboard.dismiss();

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanFirstName ||
      !cleanLastName ||
      !cleanUsername ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setMsg("Please fill in all required fields.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setMsg("Please enter a valid email address.");
      return;
    }

    if (cleanUsername.length < 3) {
      setMsg("Username must be at least 3 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9._]+$/.test(cleanUsername)) {
      setMsg("Username can only contain letters, numbers, dots, and underscores.");
      return;
    }

    if (!passwordChecks.minLength) {
      setMsg("Password must be at least 10 characters.");
      return;
    }

    if (!passwordChecks.maxLength) {
      setMsg("Password must not exceed 64 characters.");
      return;
    }

    if (!passwordChecks.uppercase) {
      setMsg("Password must include at least one uppercase letter.");
      return;
    }

    if (!passwordChecks.number) {
      setMsg("Password must include at least one number.");
      return;
    }

    if (password !== confirmPassword) {
      setMsg("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/client/register", {
        firstName: cleanFirstName,
        lastName: cleanLastName,
        username: cleanUsername,
        email: cleanEmail,
        password,
      });

      navigation.navigate("ClientOTP", {
        email: res.data?.email || cleanEmail,
      });
    } catch (err) {
      setMsg(err?.response?.data?.message || err.message || "Register failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.topGlow} />
          <View style={styles.bottomCurve} />
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.scrollContentTop}
          >
            <View style={styles.brandArea}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require("../../assets/logo.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandName}>FleetDrive</Text>
              <Text style={styles.brandTagline}>Create your CAPT customer account</Text>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={20} color="#0B1633" />
              </TouchableOpacity>

              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                Start booking vehicles and tracking your reservations.
              </Text>

              {!!msg && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{msg}</Text>
                </View>
              )}

              <Text style={styles.label}>First Name</Text>
              <View style={[styles.inputWrapper, focusedField === "firstName" && styles.inputWrapperFocused]}>
                <Feather name="user" size={18} color="#98A2B3" style={styles.leftIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Enter first name"
                  placeholderTextColor="#98A2B3"
                  value={firstName}
                  onChangeText={setFirstName}
                  onFocus={() => setFocusedField("firstName")}
                  onBlur={() => setFocusedField("")}
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.label}>Last Name</Text>
              <View style={[styles.inputWrapper, focusedField === "lastName" && styles.inputWrapperFocused]}>
                <Feather name="user" size={18} color="#98A2B3" style={styles.leftIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Enter last name"
                  placeholderTextColor="#98A2B3"
                  value={lastName}
                  onChangeText={setLastName}
                  onFocus={() => setFocusedField("lastName")}
                  onBlur={() => setFocusedField("")}
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.label}>Username</Text>
              <View style={[styles.inputWrapper, focusedField === "username" && styles.inputWrapperFocused]}>
                <Feather name="at-sign" size={18} color="#98A2B3" style={styles.leftIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Choose a username"
                  placeholderTextColor="#98A2B3"
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField("")}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, focusedField === "email" && styles.inputWrapperFocused]}>
                <Feather name="mail" size={18} color="#98A2B3" style={styles.leftIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="you@email.com"
                  placeholderTextColor="#98A2B3"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField("")}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, focusedField === "password" && styles.inputWrapperFocused]}>
                <Feather name="lock" size={18} color="#98A2B3" style={styles.leftIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Create a password"
                  placeholderTextColor="#98A2B3"
                  value={password}
                  onChangeText={(text) => setPassword(text.slice(0, 64))}
                  maxLength={64}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onFocus={() => {
                    setFocusedField("password");
                    scrollToBottom();
                  }}
                  onBlur={() => setFocusedField("")}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color="#98A2B3"
                  />
                </TouchableOpacity>
              </View>

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
              <View style={[styles.inputWrapper, focusedField === "confirmPassword" && styles.inputWrapperFocused]}>
                <Feather name="lock" size={18} color="#98A2B3" style={styles.leftIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Re-enter password"
                  placeholderTextColor="#98A2B3"
                  value={confirmPassword}
                  onChangeText={(text) => setConfirmPassword(text.slice(0, 64))}
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
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Feather
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={18}
                    color="#98A2B3"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordRulesCard}>
                <Text style={styles.passwordRulesTitle}>Password Requirements</Text>

                <Requirement
                  passed={passwordChecks.minLength}
                  text="At least 10 characters"
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
                  passed={passwordChecks.number}
                  text="At least one number"
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
                  {loading ? "Creating Account..." : "Create Account"}
                </Text>
              </TouchableOpacity>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("ClientLogin")}>
                  <Text style={styles.registerText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <LoadingOverlay visible={loading} text="Creating your account..." />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
