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
  getDocumentVerificationMeta,
  getVerificationBadgeLabel,
  getVerificationStatusTone,
} from "../utils/verification";

const INITIAL_DOCUMENTS = {
  validIdFront: null,
  validIdBack: null,
  licenseFront: null,
  licenseBack: null,
};

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

function getStatusTone(statusKey) {
  if (statusKey === "verified") return "success";
  if (statusKey === "under_review") return "warning";
  if (statusKey === "rejected") return "danger";
  if (statusKey === "selected") return "info";
  return "neutral";
}

function toDocumentReviewState(meta) {
  if (meta?.key === "verified") return "approved";
  if (meta?.key === "under_review") return "pending";
  if (meta?.key === "rejected") return "rejected";
  return "editable";
}

export default function VerificationScreen({ navigation }) {
  const [verification, setVerification] = useState(null);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [requestedLevel, setRequestedLevel] = useState("with_driver");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setRequestedLevel(
        data?.requestedLevel === "self_drive" || data?.verificationLevel === "full"
          ? "self_drive"
          : "with_driver"
      );

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

  const statusLabel = useMemo(
    () => getVerificationBadgeLabel(verification),
    [verification]
  );
  const statusTone = useMemo(
    () => getVerificationStatusTone(verification),
    [verification]
  );
  const bookingEligibility = useMemo(
    () => getBookingEligibility(verification),
    [verification]
  );
  const validIdMeta = useMemo(
    () => getDocumentVerificationMeta(verification, "validId"),
    [verification]
  );
  const licenseMeta = useMemo(
    () => getDocumentVerificationMeta(verification, "license"),
    [verification]
  );
  const isSubmitting = submitting || false;
  const validIdReviewState = toDocumentReviewState(validIdMeta);
  const licenseReviewState = toDocumentReviewState(licenseMeta);
  const requestedDocumentId = requestedLevel === "self_drive" ? "license" : "validId";
  const requestedDocumentState =
    requestedDocumentId === "license" ? licenseReviewState : validIdReviewState;
  const isPending = requestedDocumentState === "pending" || isSubmitting;
  const isUnderReview = requestedDocumentState === "pending";
  const isApproved = requestedDocumentState === "approved";
  const isRejected = requestedDocumentState === "rejected";
  const rejectionReason =
    verification?.adminRemarks ||
    verification?.rejectionReason ||
    verification?.remarks ||
    "";

  const getExistingImage = (key) => {
    if (key === "validIdFront") return verification?.validIdFront || verification?.validIdImage || "";
    if (key === "validIdBack") return verification?.validIdBack || "";
    if (key === "licenseFront") return verification?.licenseFront || verification?.driverLicenseImage || "";
    return verification?.licenseBack || "";
  };

  const getSlotMeta = (key) => {
    if (documents[key]) {
      return { label: "Selected", key: "selected" };
    }

    const documentMeta = key.startsWith("license")
      ? getDocumentVerificationMeta(verification, "license")
      : getDocumentVerificationMeta(verification, "validId");

    if (getExistingImage(key)) {
      return { label: documentMeta.label === "Missing" ? "Submitted" : documentMeta.label, key: documentMeta.key };
    }

    return { label: "Missing", key: "missing" };
  };

  const getDocumentStateForSide = (key) => {
    return key.startsWith("license") ? licenseReviewState : validIdReviewState;
  };

  const isEditableSide = (key) => {
    const state = getDocumentStateForSide(key);
    return !submitting && !["approved", "pending"].includes(state);
  };

  const canSubmit =
    !["approved", "pending"].includes(requestedDocumentState) &&
    (requestedLevel === "self_drive"
      ? Boolean(
          (documents.licenseFront || getExistingImage("licenseFront")) &&
            (documents.licenseBack || getExistingImage("licenseBack"))
        )
      : Boolean(
          (documents.validIdFront || getExistingImage("validIdFront")) &&
            (documents.validIdBack || getExistingImage("validIdBack"))
        ));

  const openPicker = async (key, source) => {
    const documentState = getDocumentStateForSide(key);
    if (documentState === "approved") {
      Alert.alert("Verification Locked", "Your verification is already approved and locked.");
      return;
    }
    if (documentState === "pending") {
      Alert.alert("Verification Under Review", "Your verification is already under review.");
      return;
    }

    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow access to continue.");
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
      if (!asset?.uri) return;

      setDocuments((prev) => ({ ...prev, [key]: asset }));
    } catch (err) {
      Alert.alert("Upload failed", err?.message || "Could not select image.");
    }
  };

  const promptImageSource = (key) => {
    const documentState = getDocumentStateForSide(key);
    if (documentState === "approved") {
      Alert.alert("Verification Locked", "Your verification is already approved and locked.");
      return;
    }
    if (documentState === "pending") {
      Alert.alert("Verification Under Review", "Your verification is already under review.");
      return;
    }

    Alert.alert("Upload document", "Choose how you want to add the image.", [
      { text: "Camera", onPress: () => openPicker(key, "camera") },
      { text: "Gallery", onPress: () => openPicker(key, "gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeDocument = async (key) => {
    const documentState = getDocumentStateForSide(key);
    if (documentState === "approved") {
      Alert.alert("Verification Locked", "Your verification is already approved and locked.");
      return;
    }
    if (documentState === "pending") {
      Alert.alert("Verification Under Review", "Your verification is already under review.");
      return;
    }

    if (documents[key]) {
      setDocuments((prev) => ({ ...prev, [key]: null }));
      return;
    }

    if (!getExistingImage(key)) return;

    try {
      setSubmitting(true);
      setError("");
      const data = await removeVerificationDocument(key);
      setVerification(data || null);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await clearClientSession();
        navigation.replace("ClientLogin");
        return;
      }

      setError(err?.response?.data?.message || "Failed to remove document.");
    } finally {
      setSubmitting(false);
    }
  };

  const validateSubmission = () => {
    if (requestedLevel === "self_drive" && !documents.licenseFront && !getExistingImage("licenseFront")) {
      return "Driver's License front image is required by the current verification flow.";
    }
    if (requestedLevel === "self_drive" && !documents.licenseBack && !getExistingImage("licenseBack")) {
      return "Driver's License back image is required by the current verification flow.";
    }
    if (requestedLevel !== "self_drive" && !documents.validIdFront && !getExistingImage("validIdFront")) {
      return "Valid ID front image is required.";
    }
    if (requestedLevel !== "self_drive" && !documents.validIdBack && !getExistingImage("validIdBack")) {
      return "Valid ID back image is required.";
    }
    return "";
  };

  const handleSubmit = async () => {
    if (requestedDocumentState === "approved") {
      Alert.alert("Verification Locked", "Your verification is already approved and locked.");
      return;
    }
    if (requestedDocumentState === "pending") {
      Alert.alert("Verification Under Review", "Your verification is already under review.");
      return;
    }

    const validationError = validateSubmission();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        verificationType: requestedLevel,
        validIdFront: documents.validIdFront
          ? toBase64DataUri(documents.validIdFront)
          : getExistingImage("validIdFront"),
        validIdBack: documents.validIdBack
          ? toBase64DataUri(documents.validIdBack)
          : getExistingImage("validIdBack"),
        licenseFront: documents.licenseFront
          ? toBase64DataUri(documents.licenseFront)
          : getExistingImage("licenseFront"),
        licenseBack: documents.licenseBack
          ? toBase64DataUri(documents.licenseBack)
          : getExistingImage("licenseBack"),
      };

      await submitVerification(payload);
      setDocuments(INITIAL_DOCUMENTS);
      await loadVerification("refresh");
      Alert.alert(
        "Submitted",
        "Your documents were submitted for admin review."
      );
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await clearClientSession();
        navigation.replace("ClientLogin");
        return;
      }

      setError(err?.response?.data?.message || "Failed to submit verification.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderUploadCard = ({ keyName, title, hint }) => {
    const localAsset = documents[keyName];
    const remoteUri = getExistingImage(keyName);
    const imageUri = localAsset?.uri || remoteUri || "";
    const slotStatus = getSlotMeta(keyName);
    const canEdit = isEditableSide(keyName);
    const hasLocalReplacement = Boolean(localAsset);
    const hasBackendImage = Boolean(remoteUri);
    const documentMeta = keyName.startsWith("license") ? licenseMeta : validIdMeta;
    const [badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle] =
      getBadgeStyles(getStatusTone(slotStatus.key));

    return (
      <View style={styles.uploadCard} key={keyName}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.uploadPreview} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <MaterialCommunityIcons
              name="image-outline"
              size={34}
              color="#94a3b8"
            />
            <Text style={styles.uploadPlaceholderText}>No image selected yet</Text>
          </View>
        )}

        <View style={styles.uploadBody}>
          <View style={styles.uploadTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadTitle}>{title}</Text>
              <Text style={styles.uploadHint}>{hint}</Text>
              {hasBackendImage && !hasLocalReplacement ? (
                <Text style={styles.uploadHint}>
                  Already submitted files can be replaced when this document is editable.
                </Text>
              ) : null}
              {documentMeta.key === "rejected" ? (
                <Text style={styles.uploadHint}>
                  Your document was rejected. Please upload a clearer replacement or delete the stored copy first.
                </Text>
              ) : null}
              {documentMeta.key === "under_review" && !hasLocalReplacement ? (
                <Text style={styles.uploadHint}>
                  Your document is submitted and waiting for admin review.
                </Text>
              ) : null}
            </View>
            <View style={[badgeStyle, badgeToneStyle]}>
              <Text style={[badgeTextStyle, badgeTextToneStyle]}>{slotStatus.label}</Text>
            </View>
          </View>

          <View style={styles.uploadActions}>
            <TouchableOpacity
              style={[styles.uploadActionButton, styles.uploadPrimary]}
              onPress={() => promptImageSource(keyName)}
              disabled={!canEdit || submitting}
            >
              <Text style={styles.uploadPrimaryText}>
                {hasLocalReplacement ? "Change" : hasBackendImage ? "Replace" : "Upload"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadActionButton, styles.uploadDanger]}
              onPress={() => removeDocument(keyName)}
              disabled={(!localAsset && !hasBackendImage) || submitting || !canEdit}
            >
              <Text style={styles.uploadDangerText}>{hasBackendImage && !localAsset ? "Delete Stored" : "Remove Selected"}</Text>
            </TouchableOpacity>
          </View>
        </View>
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

  const [badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle] =
    getBadgeStyles(statusTone);

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
              Manage your identity verification and booking eligibility.
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
                Verification is reviewed manually by admin before your booking
                eligibility changes.
              </Text>
            </View>
            <View style={[badgeStyle, badgeToneStyle]}>
              <Text style={[badgeTextStyle, badgeTextToneStyle]}>{statusLabel}</Text>
            </View>
          </View>

          {isApproved ? (
            <View style={[styles.noticeCard, { marginTop: 16, backgroundColor: "#ECFDF3", borderColor: "#BBF7D0" }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#15803D" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeText, { color: "#166534", fontWeight: "800" }]}>Verification Approved</Text>
                <Text style={[styles.noticeText, { color: "#166534" }]}>
                  Your submitted ID has been reviewed and approved. This section is now locked for your account security.
                </Text>
              </View>
            </View>
          ) : null}

          {isUnderReview ? (
            <View style={[styles.noticeCard, { marginTop: 16, backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
              <Ionicons name="time-outline" size={20} color="#CA8A04" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeText, { color: "#92400E", fontWeight: "800" }]}>Verification Under Review</Text>
                <Text style={[styles.noticeText, { color: "#92400E" }]}>
                  Your ID is being reviewed by FleetX.
                </Text>
              </View>
            </View>
          ) : null}

          {isRejected ? (
            <View style={[styles.noticeCard, { marginTop: 16, backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeText, { color: "#991B1B", fontWeight: "800" }]}>Verification Rejected</Text>
                <Text style={[styles.noticeText, { color: "#991B1B" }]}>
                  {rejectionReason || "Your submission needs replacement before you can try again."}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Current Status</Text>
              <Text style={styles.summaryValue}>{statusLabel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Admin Remarks</Text>
              <Text style={styles.summaryValue}>
                {verification?.adminRemarks || "No remarks yet."}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Reviewed Date</Text>
              <Text style={styles.summaryValue}>
                {formatReviewDate(verification?.reviewedAt)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Eligibility</Text>
          <Text style={styles.cardSubtitle}>
            Basic verification unlocks with-driver bookings. Full verification
            unlocks self-drive bookings.
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
                {bookingEligibility.withDriver ? "Available" : "Unavailable"}
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
                {bookingEligibility.selfDrive ? "Available" : "Unavailable"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Document Checklist</Text>
          <Text style={styles.cardSubtitle}>
            Make sure each document is complete before sending it for review.
          </Text>

          <View style={styles.checklistRow}>
            <View style={styles.checklistLeft}>
              <Ionicons name="card-outline" size={20} color="#f97316" />
              <View style={{ flex: 1 }}>
                <Text style={styles.checklistTitle}>Valid ID</Text>
                <Text style={styles.checklistSubtitle}>
                  Front and back are required for with-driver eligibility.
                </Text>
              </View>
            </View>
            <Text style={styles.refreshText}>
              {validIdMeta.label}
            </Text>
          </View>

          <View style={styles.checklistRow}>
            <View style={styles.checklistLeft}>
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={20}
                color="#f97316"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.checklistTitle}>Driver's License</Text>
                <Text style={styles.checklistSubtitle}>
                  Front and back are required for self-drive eligibility.
                </Text>
              </View>
            </View>
            <Text style={styles.refreshText}>
              {licenseMeta.label}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose Verification Level</Text>
          <Text style={styles.cardSubtitle}>
            Pick the booking mode you want to unlock before submitting.
          </Text>

          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                requestedLevel === "with_driver" && styles.segmentButtonActive,
              ]}
              onPress={() => setRequestedLevel("with_driver")}
              disabled={submitting}
            >
              <Text style={styles.segmentTitle}>With Driver</Text>
              <Text
                style={[
                  styles.segmentText,
                  requestedLevel === "with_driver" && styles.segmentTextActive,
                ]}
              >
                Submit Valid ID front and back for with-driver eligibility.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                requestedLevel === "self_drive" && styles.segmentButtonActive,
              ]}
              onPress={() => setRequestedLevel("self_drive")}
              disabled={submitting}
            >
              <Text style={styles.segmentTitle}>Self-Drive</Text>
              <Text
                style={[
                  styles.segmentText,
                  requestedLevel === "self_drive" && styles.segmentTextActive,
                ]}
              >
                Submit Driver's License front and back for self-drive eligibility.
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeader}>Valid ID</Text>
          <View style={styles.uploadGroup}>
            <Text style={styles.uploadGroupTitle}>Required for Basic Verification</Text>
            <Text style={styles.uploadGroupSubtitle}>
              JPG, JPEG, PNG, and WEBP are supported.
            </Text>
            <View style={styles.uploadGrid}>
              {renderUploadCard({
                keyName: "validIdFront",
                title: "Valid ID Front",
                hint: "Upload the front side of your government-issued ID.",
              })}
              {renderUploadCard({
                keyName: "validIdBack",
                title: "Valid ID Back",
                hint: "Upload the back side of the same ID.",
              })}
            </View>
          </View>

          <Text style={styles.sectionHeader}>Driver's License</Text>
          <View style={styles.uploadGroup}>
            <Text style={styles.uploadGroupTitle}>Required for Full Verification</Text>
            <Text style={styles.uploadGroupSubtitle}>
              The current backend requires both front and back images here before submission.
            </Text>
            <View style={styles.uploadGrid}>
              {renderUploadCard({
                keyName: "licenseFront",
                title: "License Front",
                hint: "Upload the front side of your Driver's License.",
              })}
              {renderUploadCard({
                keyName: "licenseBack",
                title: "License Back",
                hint: "Upload the back side of your Driver's License.",
              })}
            </View>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#f97316" />
          <Text style={styles.noticeText}>
            Your documents are used only for identity and booking eligibility
            review. They are reviewed securely by the admin.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
            !canSubmit && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || !canSubmit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {submitting
                ? "Submitting..."
                : isApproved
                ? "Verification Approved"
                : isUnderReview
                ? "Verification Under Review"
                : `Submit ${requestedLevel === "self_drive" ? "Driver's License" : "Valid ID"}`}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
