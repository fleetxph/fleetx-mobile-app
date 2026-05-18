import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearClientSession, isUnauthorizedError } from "../api/api";
import {
  getVerificationStatus,
  removeVerificationDocument,
  submitVerification,
} from "../api/clientApi";
import { styles } from "../styles/verificationStyle";
import {
  formatReviewDate,
  getBookingEligibility,
  getVerificationBadgeLabel,
  getVerificationGroupMeta,
  getVerificationStatusTone,
} from "../utils/verification";

const INITIAL_DOCUMENTS = {
  validIdFront: null,
  validIdBack: null,
  idSelfie: null,
  licenseFront: null,
  licenseBack: null,
  licenseSelfie: null,
};

const VERIFICATION_GROUPS = [
  {
    key: "validId",
    title: "Valid ID Verification",
    levelLabel: "Basic Verified",
    submitLabel: "Submit Valid ID Verification",
    verificationType: "with_driver",
    slots: [
      {
        keyName: "validIdFront",
        slotKey: "front",
        title: "Valid ID Front",
        hint: "Upload the front side of your government-issued ID.",
        sourcePrompt: "Upload Valid ID front",
      },
      {
        keyName: "validIdBack",
        slotKey: "back",
        title: "Valid ID Back",
        hint: "Upload the back side of the same ID.",
        sourcePrompt: "Upload Valid ID back",
      },
      {
        keyName: "idSelfie",
        slotKey: "selfie",
        title: "Current Selfie",
        hint: "Take a clear selfie so we can match you with the submitted document.",
        sourcePrompt: "Take Current Selfie",
        prefersCamera: true,
      },
    ],
  },
  {
    key: "license",
    title: "Driver's License Verification",
    levelLabel: "Fully Verified",
    submitLabel: "Submit Driver's License Verification",
    verificationType: "self_drive",
    slots: [
      {
        keyName: "licenseFront",
        slotKey: "front",
        title: "Driver's License Front",
        hint: "Upload the front side of your Driver's License.",
        sourcePrompt: "Upload license front",
      },
      {
        keyName: "licenseBack",
        slotKey: "back",
        title: "Driver's License Back",
        hint: "Upload the back side of your Driver's License.",
        sourcePrompt: "Upload license back",
      },
      {
        keyName: "licenseSelfie",
        slotKey: "selfie",
        title: "Current Selfie",
        hint: "Take a clear selfie so we can match you with the submitted document.",
        sourcePrompt: "Take Current Selfie",
        prefersCamera: true,
      },
    ],
  },
];

function getBadgeStyles(tone) {
  if (tone === "warning") {
    return [styles.badge, styles.badgeWarning, styles.badgeText, styles.badgeTextWarning];
  }
  if (tone === "info") {
    return [styles.badge, styles.badgeInfo, styles.badgeText, styles.badgeTextInfo];
  }
  if (tone === "success") {
    return [styles.badge, styles.badgeSuccess, styles.badgeText, styles.badgeTextSuccess];
  }
  if (tone === "danger") {
    return [styles.badge, styles.badgeDanger, styles.badgeText, styles.badgeTextDanger];
  }
  return [styles.badge, styles.badgeNeutral, styles.badgeText, styles.badgeTextNeutral];
}

function toBase64DataUri(asset) {
  if (!asset?.base64) return "";
  const mimeType = asset.mimeType || "image/jpeg";
  return `data:${mimeType};base64,${asset.base64}`;
}

function getLocalSelectionStatus(asset) {
  return asset ? { label: "Selected", tone: "info" } : null;
}

function getSlotStatusTone(statusKey) {
  if (statusKey === "approved") return "success";
  if (statusKey === "pending") return "warning";
  if (statusKey === "rejected" || statusKey === "needs_update") return "danger";
  if (statusKey === "selected") return "info";
  return "neutral";
}

export default function VerificationScreen({ navigation, route }) {
  const [verification, setVerification] = useState(null);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingGroup, setSubmittingGroup] = useState("");
  const [error, setError] = useState("");
  const requestedType = route?.params?.verificationType || "";
  const visibleGroups = useMemo(() => {
    if (requestedType === "with_driver") {
      return VERIFICATION_GROUPS.filter((group) => group.verificationType === "with_driver");
    }

    if (requestedType === "self_drive") {
      return VERIFICATION_GROUPS.filter((group) => group.verificationType === "self_drive");
    }

    return VERIFICATION_GROUPS;
  }, [requestedType]);

  const loadVerification = async (mode = "load") => {
    try {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      const data = await getVerificationStatus();
      setVerification(data || null);

      try {
        const rawUser = await AsyncStorage.getItem("clientUser");
        if (rawUser) {
          const user = JSON.parse(rawUser);
          const nextUser = {
            ...user,
            isVerified: Boolean(data?.isVerified),
            verificationStatus: data?.overallStatus || user?.verificationStatus,
            verificationType: data?.verificationType || user?.verificationType,
            verificationLevel: data?.verificationLevel || user?.verificationLevel,
            statusLabel: data?.statusLabel || user?.statusLabel,
          };
          await AsyncStorage.setItem("clientUser", JSON.stringify(nextUser));
        }
      } catch {
        // Keep screen usable if stored data is malformed.
      }
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await clearClientSession();
        navigation.replace("ClientLogin");
        return;
      }

      setError(err?.response?.data?.message || "Failed to load verification.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVerification();
    const unsubscribe = navigation.addListener("focus", () => loadVerification("refresh"));
    return unsubscribe;
  }, [navigation]);

  const statusLabel = useMemo(() => getVerificationBadgeLabel(verification), [verification]);
  const statusTone = useMemo(() => getVerificationStatusTone(verification), [verification]);
  const bookingEligibility = useMemo(() => getBookingEligibility(verification), [verification]);
  const validIdMeta = useMemo(() => getVerificationGroupMeta(verification, "validId"), [verification]);
  const licenseMeta = useMemo(() => getVerificationGroupMeta(verification, "license"), [verification]);
  const groupMetaMap = {
    validId: validIdMeta,
    license: licenseMeta,
  };

  const handleUnauthorized = async () => {
    await clearClientSession();
    navigation.replace("ClientLogin");
  };

  const openPicker = async (keyName, source) => {
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Camera access needed",
          source === "camera"
            ? "Camera access is needed to take your selfie. You can allow camera access in your device settings."
            : "Photo access is needed to continue. You can allow photo access in your device settings."
        );
        return;
      }

      const pickerFn =
        source === "camera"
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync;

      const result = await pickerFn({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri || !asset?.base64) return;

      setDocuments((prev) => ({ ...prev, [keyName]: asset }));
    } catch (err) {
      Alert.alert("Upload failed", err?.message || "Could not select image.");
    }
  };

  const promptImageSource = (slot, group) => {
    if (!group.canEdit || submittingGroup) {
      if (group.isApproved) {
        Alert.alert("Verification Locked", "This verification group is already approved and locked.");
      } else if (group.isPending) {
        Alert.alert("Verification Under Review", "This verification group is already under review.");
      }
      return;
    }

    if (slot.prefersCamera) {
      Alert.alert(slot.sourcePrompt, "Position your face within the frame. Use the camera for the clearest selfie. You can also choose an existing photo if needed.", [
        { text: "Take Selfie", onPress: () => openPicker(slot.keyName, "camera") },
        { text: "Choose Photo", onPress: () => openPicker(slot.keyName, "gallery") },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }

    Alert.alert(slot.sourcePrompt, "Choose how you want to add the image.", [
      { text: "Camera", onPress: () => openPicker(slot.keyName, "camera") },
      { text: "Gallery", onPress: () => openPicker(slot.keyName, "gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeDocument = async (keyName, slotMeta, groupMeta) => {
    if (!groupMeta.canEdit || submittingGroup) {
      if (groupMeta.isApproved) {
        Alert.alert("Verification Locked", "This verification group is already approved and locked.");
      } else if (groupMeta.isPending) {
        Alert.alert("Verification Under Review", "This verification group is already under review.");
      }
      return;
    }

    if (documents[keyName]) {
      setDocuments((prev) => ({ ...prev, [keyName]: null }));
      return;
    }

    if (!slotMeta.uri) return;

    try {
      setSubmittingGroup(groupMeta.groupKey);
      setError("");
      const data = await removeVerificationDocument(keyName);
      setVerification(data || null);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await handleUnauthorized();
        return;
      }

      setError(err?.response?.data?.message || "Failed to remove document.");
    } finally {
      setSubmittingGroup("");
    }
  };

  const buildGroupPayload = (groupConfig, groupMeta) => {
    const slotFront = groupConfig.slots.find((slot) => slot.slotKey === "front");
    const slotBack = groupConfig.slots.find((slot) => slot.slotKey === "back");
    const slotSelfie = groupConfig.slots.find((slot) => slot.slotKey === "selfie");

    const frontValue = documents[slotFront.keyName]
      ? toBase64DataUri(documents[slotFront.keyName])
      : groupMeta.slots.front.uri;
    const backValue = documents[slotBack.keyName]
      ? toBase64DataUri(documents[slotBack.keyName])
      : groupMeta.slots.back.uri;
    const selfieValue = documents[slotSelfie.keyName]
      ? toBase64DataUri(documents[slotSelfie.keyName])
      : groupMeta.slots.selfie.uri;

    const payload = {
      verificationType: groupConfig.verificationType,
    };

    if (groupConfig.key === "validId") {
      payload.validIdFront = frontValue;
      payload.validIdBack = backValue;
      payload.idSelfie = selfieValue;
      payload.validIdSelfie = selfieValue;
    } else {
      payload.licenseFront = frontValue;
      payload.licenseBack = backValue;
      payload.licenseSelfie = selfieValue;
      payload.driverLicenseSelfie = selfieValue;
    }

    return payload;
  };

  const validateGroupSubmission = (groupConfig, groupMeta) => {
    const slotFront = groupConfig.slots.find((slot) => slot.slotKey === "front");
    const slotBack = groupConfig.slots.find((slot) => slot.slotKey === "back");
    const slotSelfie = groupConfig.slots.find((slot) => slot.slotKey === "selfie");

    if (!documents[slotFront.keyName] && !groupMeta.slots.front.uri) {
      return `${slotFront.title} is required.`;
    }

    if (!documents[slotBack.keyName] && !groupMeta.slots.back.uri) {
      return `${slotBack.title} is required.`;
    }

    if (!documents[slotSelfie.keyName] && !groupMeta.slots.selfie.uri) {
      return "Current Selfie is required.";
    }

    return "";
  };

  const handleSubmitGroup = async (groupConfig) => {
    const groupMeta = groupMetaMap[groupConfig.key];

    if (!groupMeta.canEdit) {
      if (groupMeta.isApproved) {
        Alert.alert("Verification Locked", "This verification group is already approved and locked.");
      } else if (groupMeta.isPending) {
        Alert.alert("Verification Under Review", "This verification group is already under review.");
      }
      return;
    }

    const validationError = validateGroupSubmission(groupConfig, groupMeta);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmittingGroup(groupConfig.key);
      setError("");
      const payload = buildGroupPayload(groupConfig, groupMeta);
      await submitVerification(payload);
      setDocuments((prev) => ({
        ...prev,
        [groupConfig.slots[0].keyName]: null,
        [groupConfig.slots[1].keyName]: null,
        [groupConfig.slots[2].keyName]: null,
      }));
      await loadVerification("refresh");
      Alert.alert("Submitted", `${groupConfig.title} was submitted for admin review.`);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await handleUnauthorized();
        return;
      }

      setError(err?.response?.data?.message || "Failed to submit verification.");
    } finally {
      setSubmittingGroup("");
    }
  };

  const renderUploadCard = (groupMeta, slot) => {
    const slotMeta = groupMeta.slots[slot.slotKey];
    const localAsset = documents[slot.keyName];
    const imageUri = localAsset?.uri || slotMeta.uri || "";
    const localStatus = getLocalSelectionStatus(localAsset);
    const slotLabel = localStatus?.label || slotMeta.label;
    const slotTone = getSlotStatusTone(localStatus ? "selected" : slotMeta.key);
    const [badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle] = getBadgeStyles(slotTone);
    const isBusy = submittingGroup === groupMeta.groupKey;

    return (
      <View style={styles.uploadCard} key={slot.keyName}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.uploadPreview} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <MaterialCommunityIcons
              name={slot.slotKey === "selfie" ? "face-recognition" : "image-outline"}
              size={34}
              color="#94a3b8"
            />
            <Text style={styles.uploadPlaceholderText}>No image selected yet</Text>
          </View>
        )}

        <View style={styles.uploadBody}>
          <View style={styles.uploadTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadTitle}>{slot.title}</Text>
              <Text style={styles.uploadHint}>{slot.hint}</Text>
            </View>
            <View style={[badgeStyle, badgeToneStyle]}>
              <Text style={[badgeTextStyle, badgeTextToneStyle]}>{slotLabel}</Text>
            </View>
          </View>

          {slotMeta.remarks ? (
            <Text style={styles.slotRemark}>Admin note: {slotMeta.remarks}</Text>
          ) : null}

          {slot.slotKey === "selfie" ? (
            <View style={styles.selfieButtonWrap}>
              <TouchableOpacity
                style={[
                  styles.uploadActionButton,
                  styles.selfieActionButton,
                  styles.uploadPrimary,
                  (!groupMeta.canEdit || isBusy) && styles.submitButtonDisabled,
                ]}
                onPress={() => promptImageSource(slot, groupMeta)}
                disabled={!groupMeta.canEdit || isBusy}
              >
                <Text style={styles.uploadPrimaryText}>
                  {localAsset ? "Retake Current Selfie" : "Take Current Selfie"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.uploadActions}>
            {slot.slotKey !== "selfie" ? (
              <TouchableOpacity
                style={[
                  styles.uploadActionButton,
                  styles.uploadPrimary,
                  (!groupMeta.canEdit || isBusy) && styles.submitButtonDisabled,
                ]}
                onPress={() => promptImageSource(slot, groupMeta)}
                disabled={!groupMeta.canEdit || isBusy}
              >
                <Text style={styles.uploadPrimaryText}>
                  {localAsset ? "Change" : slotMeta.uri ? "Replace" : "Upload"}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.uploadActionButton,
                styles.uploadDanger,
                ((!localAsset && !slotMeta.uri) || !groupMeta.canEdit || isBusy) && styles.submitButtonDisabled,
              ]}
              onPress={() => removeDocument(slot.keyName, slotMeta, groupMeta)}
              disabled={(!localAsset && !slotMeta.uri) || !groupMeta.canEdit || isBusy}
            >
              <Text style={styles.uploadDangerText}>
                {slotMeta.uri && !localAsset ? "Remove Submitted" : "Remove"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderGroupCard = (groupConfig) => {
    const groupMeta = groupMetaMap[groupConfig.key];
    const [badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle] = getBadgeStyles(groupMeta.tone);
    const isBusy = submittingGroup === groupConfig.key;
    const isHighlighted = requestedType === groupConfig.verificationType;

    return (
      <View
        key={groupConfig.key}
        style={[styles.card, isHighlighted && styles.highlightCard]}
      >
        <View style={styles.statusTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{groupConfig.title}</Text>
            <Text style={styles.cardSubtitle}>
              {groupConfig.key === "validId"
                ? "Required slots: Valid ID front, Valid ID back, and current selfie."
                : "Required slots: Driver's License front, Driver's License back, and current selfie."}
            </Text>
          </View>
          <View style={[badgeStyle, badgeToneStyle]}>
            <Text style={[badgeTextStyle, badgeTextToneStyle]}>{groupMeta.label}</Text>
          </View>
        </View>

        <View style={styles.levelRow}>
          <Text style={styles.summaryLabel}>Verification Level</Text>
          <Text style={styles.levelValue}>
            {groupMeta.isApproved ? groupConfig.levelLabel : "Not yet approved"}
          </Text>
        </View>

        <View style={styles.levelRow}>
          <Text style={styles.summaryLabel}>Verification Summary</Text>
          <Text style={styles.levelValue}>
            Documents: {groupMeta.slots.front.hasDocument && groupMeta.slots.back.hasDocument ? "Front and back uploaded" : "Incomplete"}
          </Text>
          <Text style={styles.summarySubvalue}>
            Selfie: {groupMeta.slots.selfie.hasDocument ? "Captured" : "Missing"}
          </Text>
        </View>

        {groupMeta.remarks ? (
          <View style={styles.noticeCard}>
            <Ionicons
              name={groupMeta.isRejected || groupMeta.needsUpdate ? "alert-circle-outline" : "information-circle-outline"}
              size={20}
              color={groupMeta.isRejected || groupMeta.needsUpdate ? "#DC2626" : "#f97316"}
            />
            <Text style={styles.noticeText}>Admin note: {groupMeta.remarks}</Text>
          </View>
        ) : null}

        <View style={styles.uploadGrid}>
          {groupConfig.slots.map((slot) => renderUploadCard(groupMeta, slot))}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (isBusy || !groupMeta.canEdit || !groupMeta.hasAllDocuments) && styles.submitButtonDisabled,
          ]}
          onPress={() => handleSubmitGroup(groupConfig)}
          disabled={isBusy || !groupMeta.canEdit || !groupMeta.hasAllDocuments}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {groupMeta.isApproved
                ? "Approved"
                : groupMeta.isPending
                ? "Pending Review"
                : groupMeta.isRejected || groupMeta.needsUpdate
                ? `Resubmit ${groupConfig.title}`
                : groupConfig.submitLabel}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={[styles.subtitle, { marginTop: 12 }]}>Loading verification...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const [badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle] = getBadgeStyles(statusTone);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={20} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Account Verification</Text>
            <Text style={styles.subtitle}>
              Manage your identity verification, selfies, and booking eligibility.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => loadVerification("refresh")}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#f97316" />
            ) : (
              <Feather name="refresh-cw" size={18} color="#f97316" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.statusTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Status Summary</Text>
              <Text style={styles.cardSubtitle}>
                Each verification group is reviewed separately. One rejected document will not reset the other group.
              </Text>
            </View>
            <View style={[badgeStyle, badgeToneStyle]}>
              <Text style={[badgeTextStyle, badgeTextToneStyle]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Basic Verified</Text>
              <Text style={styles.summaryValue}>{validIdMeta.isApproved ? "Approved" : validIdMeta.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fully Verified</Text>
              <Text style={styles.summaryValue}>{licenseMeta.isApproved ? "Approved" : licenseMeta.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Last Reviewed</Text>
              <Text style={styles.summaryValue}>
                {formatReviewDate(verification?.reviewedAt)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Eligibility</Text>
          <Text style={styles.cardSubtitle}>
            Basic verification unlocks with-driver bookings. Full verification unlocks self-drive bookings.
          </Text>
          <View style={styles.eligibilityRow}>
            <View
              style={[
                styles.eligibilityCard,
                bookingEligibility.withDriver && styles.eligibilityCardActive,
              ]}
            >
              <Text style={styles.eligibilityLabel}>With Driver</Text>
              <Text style={styles.eligibilityValue}>
                {bookingEligibility.withDriver ? "Available" : bookingEligibility.withDriverLabel}
              </Text>
            </View>
            <View
              style={[
                styles.eligibilityCard,
                bookingEligibility.selfDrive && styles.eligibilityCardActive,
              ]}
            >
              <Text style={styles.eligibilityLabel}>Self-Drive</Text>
              <Text style={styles.eligibilityValue}>
                {bookingEligibility.selfDrive ? "Available" : bookingEligibility.selfDriveLabel}
              </Text>
            </View>
          </View>
        </View>

        {visibleGroups.map((group) => renderGroupCard(group))}

        <View style={styles.noticeCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#f97316" />
          <Text style={styles.noticeText}>
            Your documents and selfies are used only for identity and booking eligibility review. They are reviewed securely by FleetX admin.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
