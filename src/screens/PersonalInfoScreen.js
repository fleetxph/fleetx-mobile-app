import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { isUnauthorizedError } from "../api/api";
import { getClientProfile, updateClientProfile } from "../api/clientApi";
import { styles } from "../styles/personalInfoStyle";
import { getProfileImageUrl } from "../utils/imageUrl";

function getInitials(user) {
  const first =
    user?.firstName?.[0] ||
    user?.name?.trim()?.[0] ||
    user?.username?.trim()?.[0] ||
    "A";
  const last =
    user?.lastName?.[0] ||
    user?.name?.trim()?.split(" ")?.[1]?.[0] ||
    "";

  return `${first}${last}`.toUpperCase();
}

export default function PersonalInfoScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    contactNumber: "",
    address: "",
  });
  const [errors, setErrors] = useState({});

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getClientProfile();
      const nextUser = data?.user || null;
      setUser(nextUser);
      setForm({
        contactNumber:
          nextUser?.contact || nextUser?.phone || nextUser?.mobile || "",
        address: nextUser?.address || nextUser?.location || "",
      });
      setErrors({});
    } catch (err) {
      if (isUnauthorizedError(err)) {
        Alert.alert("Session expired", "Please sign in again to continue.", [
          {
            text: "Sign In",
            onPress: () => navigation.replace("ClientLogin"),
          },
        ]);
        return;
      }

      Alert.alert("Load failed", err?.response?.data?.message || "Could not load profile.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const initials = useMemo(() => getInitials(user), [user]);

  const updateField = (key, value) => {
    if (key === "contactNumber") {
      value = String(value || "").replace(/\D/g, "").slice(0, 11);
    }

    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!/^09\d{9}$/.test(form.contactNumber || "")) {
      nextErrors.contactNumber = "Enter a valid 11-digit mobile number.";
    }

    if (!String(form.address || "").trim()) {
      nextErrors.address = "Address is required.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        contact: form.contactNumber,
        address: form.address.trim(),
      };

      const response = await updateClientProfile(payload);
      const updatedUser = response?.user || {};

      setUser(updatedUser);

      try {
        const rawStoredUser = await AsyncStorage.getItem("clientUser");
        const storedUser = rawStoredUser ? JSON.parse(rawStoredUser) : {};
        const nextStoredUser = { ...storedUser, ...updatedUser };
        await AsyncStorage.setItem("clientUser", JSON.stringify(nextStoredUser));
        await AsyncStorage.setItem("clientName", nextStoredUser?.name || "");
        await AsyncStorage.setItem("clientEmail", nextStoredUser?.email || "");
      } catch {
        // Keep screen usable even if local cache is malformed.
      }

      Alert.alert("Success", "Profile updated successfully.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        Alert.alert("Session expired", "Please sign in again to continue.", [
          {
            text: "Sign In",
            onPress: () => navigation.replace("ClientLogin"),
          },
        ]);
        return;
      }

      Alert.alert(
        "Update failed",
        err?.response?.data?.message || "Could not update profile."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={[styles.subtitle, { marginTop: 12 }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color="#0f172a" />
            </TouchableOpacity>

            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Personal Information</Text>
              <Text style={styles.subtitle}>Manage your account details</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <View style={styles.avatarWrap}>
                {getProfileImageUrl(user) ? (
                  <Image source={{ uri: getProfileImageUrl(user) }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>

              <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryName}>
                  {user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Account User"}
                </Text>
                <Text style={styles.summaryEmail}>{user?.email || "No email available"}</Text>
                <Text style={styles.mutedNote}>
                  Some fields are locked for security.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <Text style={styles.sectionSubtitle}>
              Review your information below and update the fields you are allowed to edit.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                value={user?.name || ""}
                editable={false}
                style={[styles.input, styles.inputDisabled]}
              />
              <Text style={styles.helperText}>Contact admin to change name.</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                value={user?.email || ""}
                editable={false}
                autoCapitalize="none"
                style={[styles.input, styles.inputDisabled]}
              />
              <Text style={styles.helperText}>
                Email is locked for security.
              </Text>
            </View>

            {user?.username ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  value={user?.username || ""}
                  editable={false}
                  autoCapitalize="none"
                  style={[styles.input, styles.inputDisabled]}
                />
                <Text style={styles.helperText}>Username is locked for security.</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contact Number</Text>
              <TextInput
                value={form.contactNumber}
                onChangeText={(value) => updateField("contactNumber", value)}
                keyboardType="number-pad"
                style={styles.input}
                placeholder="09XXXXXXXXX"
                placeholderTextColor="#94a3b8"
              />
              {!!errors.contactNumber ? (
                <Text style={styles.errorText}>{errors.contactNumber}</Text>
              ) : (
                <Text style={styles.helperText}>
                  Use an 11-digit Philippine mobile number.
                </Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Address / Location</Text>
              <TextInput
                value={form.address}
                onChangeText={(value) => updateField("address", value)}
                multiline
                style={[styles.input, styles.inputMultiline]}
                placeholder="Enter your full address"
                placeholderTextColor="#94a3b8"
              />
              {!!errors.address ? (
                <Text style={styles.errorText}>{errors.address}</Text>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
              disabled={submitting}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                submitting && styles.primaryButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
