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
  doesLicenseSatisfyValidId,
  formatReviewDate,
  getBookingEligibility,
  getVerificationBadgeLabel,
  getVerificationGroupMeta,
  getVerificationServerFieldDebug,
  getVerificationStatusTone,
  getValidIdEquivalentDisplay,
  isVerificationGroupEditable,
} from "../utils/verification";
import { formatExpiryDate } from "../utils/documentExpiry";
import {
  getVerificationStatusTone as getNormalizedStatusTone,
  isVerificationApproved,
  isVerificationPending,
  isVerificationRejected,
  normalizeVerificationStatus,
} from "../utils/verificationStatus";

const INITIAL_DOCUMENTS = {
  validIdFront: null,
  validIdBack: null,
  validIdSelfie: null,
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
        keyName: "validIdSelfie",
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

function getSlotStatusTone(statusKey) {
  if (statusKey === "under_review") return "warning";
  if (statusKey === "selected") return "info";
  return getNormalizedStatusTone(statusKey);
}

function mapRequestedTypeToGroupKey(requestedType) {
  if (requestedType === "self_drive") return "license";
  if (requestedType === "with_driver") return "validId";
  return "";
}

function getGroupPriority(meta) {
  if (!meta) return 999;
  if (meta.isRejected || meta.needsUpdate) return 1;
  if (meta.key === "not_submitted" || meta.isIncomplete) return 2;
  if (meta.isPending) return 3;
  if (meta.groupKey === "validId") return 4;
  return 5;
}

function getDefaultSelectedGroup(validIdMeta, licenseMeta, requestedType) {
  const requestedGroup = mapRequestedTypeToGroupKey(requestedType);
  if (requestedGroup) return requestedGroup;

  return [validIdMeta, licenseMeta]
    .filter(Boolean)
    .sort((left, right) => getGroupPriority(left) - getGroupPriority(right))[0]?.groupKey || "validId";
}

function getSlotDisplayStatus(groupMeta, slotMeta, localAsset) {
  if (localAsset) {
    return { key: "selected", label: "Selected" };
  }

  if (slotMeta.uri) {
    if (isVerificationApproved(slotMeta.key) || isVerificationApproved(groupMeta.key)) {
      return { key: "approved", label: "Approved" };
    }

    if (isVerificationPending(slotMeta.key) || isVerificationPending(groupMeta.key)) {
      return { key: "under_review", label: "Under Review" };
    }

    if (isVerificationRejected(slotMeta.key) || ["rejected", "missing", "incomplete"].includes(slotMeta.key)) {
      return { key: "needs_update", label: "Needs Update" };
    }

    return { key: "under_review", label: "Under Review" };
  }

  if (groupMeta.isRejected || groupMeta.needsUpdate || isVerificationRejected(groupMeta.key)) {
    return { key: "needs_update", label: "Needs Update" };
  }

  return { key: "not_submitted", label: "Not submitted" };
}

export default function VerificationScreen({ navigation, route }) {
  const [verification, setVerification] = useState(null);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [slotErrors, setSlotErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingGroup, setSubmittingGroup] = useState("");
  const [error, setError] = useState("");
  const [selectedVerificationGroup, setSelectedVerificationGroup] = useState("validId");
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const requestedType = route?.params?.verificationType || "";

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

      if (__DEV__) {
        console.log("[VerificationData][serverFields]", getVerificationServerFieldDebug(data || {}));
      }

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

      return data || null;
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await clearClientSession();
        navigation.replace("ClientLogin");
        return null;
      }

      setError(err?.response?.data?.message || "Failed to load verification.");
      return null;
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
  const validIdEquivalentDisplay = useMemo(
    () => getValidIdEquivalentDisplay(verification),
    [verification]
  );
  const groupConfigMap = useMemo(
    () => Object.fromEntries(VERIFICATION_GROUPS.map((group) => [group.key, group])),
    []
  );
  const visibleGroupConfig = groupConfigMap[selectedVerificationGroup] || groupConfigMap.validId;
  const visibleGroupMeta = groupMetaMap[selectedVerificationGroup] || validIdMeta;
  const visibleSelfieKeyName =
    visibleGroupConfig?.slots.find((slot) => slot.slotKey === "selfie")?.keyName || "validIdSelfie";

  const clearSlotError = (keyName) => {
    setSlotErrors((prev) => {
      if (!prev[keyName]) return prev;
      const next = { ...prev };
      delete next[keyName];
      return next;
    });
  };

  useEffect(() => {
    const requestedGroup = mapRequestedTypeToGroupKey(requestedType);
    if (requestedGroup) {
      setSelectedVerificationGroup(requestedGroup);
      setHasInitializedSelection(true);
      return;
    }

    if (!hasInitializedSelection) {
      const nextGroup = getDefaultSelectedGroup(validIdMeta, licenseMeta, requestedType);
      setSelectedVerificationGroup(nextGroup);
      setHasInitializedSelection(true);
    }
  }, [requestedType, validIdMeta, licenseMeta, hasInitializedSelection]);

  useEffect(() => {
    if (__DEV__) {
      console.log("[VerificationUI][selectedGroup]", {
        selectedVerificationGroup,
        visibleGroup: visibleGroupConfig?.key || "",
        validIdStatus: validIdMeta.key,
        licenseStatus: licenseMeta.key,
      });
    }
  }, [selectedVerificationGroup, visibleGroupConfig, validIdMeta.key, licenseMeta.key]);

  useEffect(() => {
    if (__DEV__ && visibleGroupMeta) {
      const submitEnabled =
        Boolean(visibleGroupMeta.canEdit) &&
        !visibleGroupMeta.isApproved &&
        !visibleGroupMeta.isPending &&
        !(selectedVerificationGroup === "validId" && validIdEquivalentDisplay.isEquivalentApproved);

      console.log("[VerificationLocking][group]", {
        group: visibleGroupMeta.groupKey,
        groupStatus: visibleGroupMeta.key,
        normalizedStatus: normalizeVerificationStatus(visibleGroupMeta.key),
        groupEditable: visibleGroupMeta.canEdit,
        submitEnabled,
      });

      console.log("[VerificationUI][editable]", {
        group: visibleGroupMeta.groupKey,
        groupStatus: visibleGroupMeta.key,
        frontEditable: isVerificationGroupEditable(visibleGroupMeta.key, visibleGroupMeta.slots.front.key),
        backEditable: isVerificationGroupEditable(visibleGroupMeta.key, visibleGroupMeta.slots.back.key),
        selfieEditable: isVerificationGroupEditable(visibleGroupMeta.key, visibleGroupMeta.slots.selfie.key),
      });
    }
  }, [selectedVerificationGroup, validIdEquivalentDisplay.isEquivalentApproved, visibleGroupMeta]);

  useEffect(() => {
    const hasValidIdSelfie = Boolean(documents.validIdSelfie || validIdMeta.slots.selfie.uri);
    const hasLicenseSelfie = Boolean(documents.licenseSelfie || licenseMeta.slots.selfie.uri);
    const currentVisibleSelfieAsset = documents[visibleSelfieKeyName];
    const currentVisibleSelfieServerUri = visibleGroupMeta?.slots?.selfie?.uri || "";
    const selfieStatus = getSlotDisplayStatus(
      visibleGroupMeta,
      visibleGroupMeta?.slots?.selfie || { uri: "", key: "not_submitted" },
      currentVisibleSelfieAsset
    ).label;

    if (__DEV__) {
      console.log("[VerificationSelfie][state]", {
        selectedGroup: selectedVerificationGroup,
        hasValidIdSelfie,
        hasLicenseSelfie,
        hasCurrentVisibleSelfie: Boolean(currentVisibleSelfieAsset || currentVisibleSelfieServerUri),
        selfieStatus,
      });
    }
  }, [
    selectedVerificationGroup,
    documents.validIdSelfie,
    documents.licenseSelfie,
    visibleSelfieKeyName,
    visibleGroupMeta,
    validIdMeta.slots.selfie.uri,
    licenseMeta.slots.selfie.uri,
  ]);

  useEffect(() => {
    if (__DEV__) {
      console.log("[VerificationEligibility][computed]", {
        validIdStatus: bookingEligibility.validId.key,
        licenseStatus: bookingEligibility.license.key,
        withDriverStatus: bookingEligibility.withDriverStatus,
        selfDriveStatus: bookingEligibility.selfDriveStatus,
        withDriverSource: bookingEligibility.withDriverSource,
      });
    }
  }, [bookingEligibility]);

  useEffect(() => {
    if (__DEV__) {
      console.log("[VerificationEligibility][validIdEquivalent]", {
        validIdStatus: validIdMeta.key,
        licenseStatus: licenseMeta.key,
        licenseSatisfiesValidId: doesLicenseSatisfyValidId(verification),
        displayedValidIdStatus: validIdEquivalentDisplay.displayedStatus,
        withDriverStatus: bookingEligibility.withDriverStatus,
      });
    }
  }, [bookingEligibility.withDriverStatus, licenseMeta.key, validIdEquivalentDisplay, validIdMeta.key, verification]);

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
      clearSlotError(keyName);
      if (keyName === visibleSelfieKeyName) {
        setError((prev) =>
          prev === "Please take a current selfie for verification." ||
          prev === "Face verification photo is required."
            ? ""
            : prev
        );
      }
    } catch (err) {
      Alert.alert("Upload failed", err?.message || "Could not select image.");
    }
  };

  const promptImageSource = (slot, group) => {
    const slotMeta = group.slots[slot.slotKey];
    const renewalEditable = Boolean(group.expiry?.renewalAllowed) && Boolean(group.expiry?.isNearExpiry || group.expiry?.isExpired);
    const isEditable = renewalEditable || isVerificationGroupEditable(group.key, slotMeta.key);

    if (!isEditable || submittingGroup) {
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
    const renewalEditable = Boolean(groupMeta.expiry?.renewalAllowed) && Boolean(groupMeta.expiry?.isNearExpiry || groupMeta.expiry?.isExpired);
    const isEditable = renewalEditable || isVerificationGroupEditable(groupMeta.key, slotMeta.key);

    if (!isEditable || submittingGroup) {
      if (groupMeta.isApproved) {
        Alert.alert("Verification Locked", "This verification group is already approved and locked.");
      } else if (groupMeta.isPending) {
        Alert.alert("Verification Under Review", "This verification group is already under review.");
      }
      return;
    }

    if (documents[keyName]) {
      setDocuments((prev) => ({ ...prev, [keyName]: null }));
      clearSlotError(keyName);
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
      facePhoto: selfieValue,
    };

    if (groupConfig.key === "validId") {
      payload.validIdFront = frontValue;
      payload.validIdBack = backValue;
      payload.validIdSelfie = selfieValue;
    } else {
      payload.licenseFront = frontValue;
      payload.licenseBack = backValue;
      payload.licenseSelfie = selfieValue;
    }

    return payload;
  };

  const getCanonicalSelfieFieldName = (groupKey) =>
    groupKey === "license" ? "licenseSelfie" : "validIdSelfie";

  const getGroupLocalDocumentState = (groupConfig) => ({
    [groupConfig.slots[0].keyName]: documents[groupConfig.slots[0].keyName],
    [groupConfig.slots[1].keyName]: documents[groupConfig.slots[1].keyName],
    [groupConfig.slots[2].keyName]: documents[groupConfig.slots[2].keyName],
  });

  const clearGroupLocalDocuments = (groupConfig) => {
    setDocuments((prev) => ({
      ...prev,
      [groupConfig.slots[0].keyName]: null,
      [groupConfig.slots[1].keyName]: null,
      [groupConfig.slots[2].keyName]: null,
    }));
  };

  const syncGroupLocalDocumentsAfterRefresh = (groupConfig, nextVerification, submittedLocalDocuments) => {
    const refreshedGroupMeta = getVerificationGroupMeta(nextVerification, groupConfig.key);
    const nextDocuments = {};

    groupConfig.slots.forEach((slot) => {
      const localAsset = submittedLocalDocuments[slot.keyName];
      const slotMeta = refreshedGroupMeta.slots[slot.slotKey];
      nextDocuments[slot.keyName] = localAsset && !slotMeta.uri ? localAsset : null;
    });

    setDocuments((prev) => ({
      ...prev,
      ...nextDocuments,
    }));
  };

  const validateGroupSubmission = (groupConfig, groupMeta) => {
    const slotFront = groupConfig.slots.find((slot) => slot.slotKey === "front");
    const slotBack = groupConfig.slots.find((slot) => slot.slotKey === "back");
    const slotSelfie = groupConfig.slots.find((slot) => slot.slotKey === "selfie");

    const needsFrontUpdate = ["missing", "incomplete", "rejected", "needs_update"].includes(
      groupMeta.slots.front.key
    );
    const needsBackUpdate = ["missing", "incomplete", "rejected", "needs_update"].includes(
      groupMeta.slots.back.key
    );
    const needsSelfieUpdate = ["missing", "incomplete", "rejected", "needs_update"].includes(
      groupMeta.slots.selfie.key
    );

    if (
      (!documents[slotFront.keyName] && !groupMeta.slots.front.uri) ||
      (needsFrontUpdate && !documents[slotFront.keyName])
    ) {
      return { field: slotFront.keyName, message: `${slotFront.title} is required.` };
    }

    if (
      (!documents[slotBack.keyName] && !groupMeta.slots.back.uri) ||
      (needsBackUpdate && !documents[slotBack.keyName])
    ) {
      return { field: slotBack.keyName, message: `${slotBack.title} is required.` };
    }

    if (
      (!documents[slotSelfie.keyName] && !groupMeta.slots.selfie.uri) ||
      (needsSelfieUpdate && !documents[slotSelfie.keyName])
    ) {
      return {
        field: slotSelfie.keyName,
        message: "Please take a current selfie for verification.",
      };
    }

    return null;
  };

  const handleSubmitGroup = async (groupConfig) => {
    const groupMeta = groupMetaMap[groupConfig.key];
    const renewalEditable = Boolean(groupMeta.expiry?.renewalAllowed) && Boolean(groupMeta.expiry?.isNearExpiry || groupMeta.expiry?.isExpired);

    if (!groupMeta.canEdit && !renewalEditable) {
      if (groupMeta.isApproved) {
        Alert.alert("Verification Locked", "This verification group is already approved and locked.");
      } else if (groupMeta.isPending) {
        Alert.alert("Verification Under Review", "This verification group is already under review.");
      }
      return;
    }

    const validationError = validateGroupSubmission(groupConfig, groupMeta);
    if (validationError) {
      setSlotErrors({ [validationError.field]: validationError.message });
      setError("");
      return;
    }

    try {
      setSubmittingGroup(groupConfig.key);
      setError("");
      setSlotErrors({});
      const submittedLocalDocuments = getGroupLocalDocumentState(groupConfig);
      const payload = buildGroupPayload(groupConfig, groupMeta);
      const selfieFieldName = "facePhoto";
      if (__DEV__) {
        console.log("[VerificationSubmit][payload]", {
          group: groupConfig.key,
          hasFront: Boolean(payload.validIdFront || payload.licenseFront),
          hasBack: Boolean(payload.validIdBack || payload.licenseBack),
          hasSelfie: Boolean(payload.facePhoto),
          selfieFieldName,
          hasLocalFront: Boolean(documents[groupConfig.slots[0].keyName]),
          hasLocalBack: Boolean(documents[groupConfig.slots[1].keyName]),
          hasLocalSelfie: Boolean(documents[groupConfig.slots[2].keyName]),
        });
      }
      const submitResponse = await submitVerification(payload);
      const nextVerification = await loadVerification("refresh");

      if (nextVerification) {
        syncGroupLocalDocumentsAfterRefresh(groupConfig, nextVerification, submittedLocalDocuments);
      } else if (submitResponse) {
        setVerification((prev) => ({ ...(prev || {}), ...submitResponse }));
        syncGroupLocalDocumentsAfterRefresh(
          groupConfig,
          { ...(verification || {}), ...submitResponse },
          submittedLocalDocuments
        );
      } else {
        setDocuments((prev) => ({
          ...prev,
          [groupConfig.slots[0].keyName]:
            prev[groupConfig.slots[0].keyName] || submittedLocalDocuments[groupConfig.slots[0].keyName],
          [groupConfig.slots[1].keyName]:
            prev[groupConfig.slots[1].keyName] || submittedLocalDocuments[groupConfig.slots[1].keyName],
          [groupConfig.slots[2].keyName]:
            prev[groupConfig.slots[2].keyName] || submittedLocalDocuments[groupConfig.slots[2].keyName],
        }));
      }

      const finalVerificationData =
        nextVerification || (submitResponse ? { ...(verification || {}), ...submitResponse } : null);
      const refreshedGroupMeta = finalVerificationData
        ? getVerificationGroupMeta(finalVerificationData, groupConfig.key)
        : null;

      if (refreshedGroupMeta?.hasAllDocuments) {
        clearGroupLocalDocuments(groupConfig);
      }

      setSlotErrors({});
      Alert.alert("Submitted", `${groupConfig.title} was submitted for admin review.`);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await handleUnauthorized();
        return;
      }

      const submitMessage = err?.response?.data?.message || "Failed to submit verification.";
      if (submitMessage === "Face verification photo is required.") {
        setSlotErrors({
          [groupConfig.slots[2].keyName]: "Please take a current selfie for verification.",
        });
        setError("");
        return;
      }

      setError(submitMessage);
    } finally {
      setSubmittingGroup("");
    }
  };

  const renderUploadCard = (groupMeta, slot) => {
    const slotMeta = groupMeta.slots[slot.slotKey];
    const localAsset = documents[slot.keyName];
    const imageUri = localAsset?.uri || slotMeta.uri || "";
    const slotStatus = getSlotDisplayStatus(groupMeta, slotMeta, localAsset);
    const slotLabel = slotStatus.label;
    const slotTone = getSlotStatusTone(slotStatus.key);
    const [badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle] = getBadgeStyles(slotTone);
    const isBusy = submittingGroup === groupMeta.groupKey;
    const renewalEditable = Boolean(groupMeta.expiry?.renewalAllowed) && Boolean(groupMeta.expiry?.isNearExpiry || groupMeta.expiry?.isExpired);
    const isEditable = renewalEditable || isVerificationGroupEditable(groupMeta.key, slotMeta.key);
    const hasLocalAsset = Boolean(localAsset);
    const canRemoveLocal = hasLocalAsset && isEditable && !isBusy;
    const canRemoveSubmitted = Boolean(slotMeta.uri) && isEditable && !isBusy;
    const removeDisabled = !canRemoveLocal && !canRemoveSubmitted;
    const canPromptUpload = isEditable && !isBusy;
    const slotError = slotErrors[slot.keyName];
    const slotHelperText = renewalEditable
      ? "You can update this document because renewal is available."
      : isVerificationApproved(slotMeta.key) || isVerificationApproved(groupMeta.key)
      ? "This document has been approved and is locked."
      : isVerificationPending(slotMeta.key) || isVerificationPending(groupMeta.key)
      ? "Your document is submitted and waiting for admin review."
      : "";

    if (__DEV__) {
      console.log("[VerificationLocking][slot]", {
        group: groupMeta.groupKey,
        slot: slot.slotKey,
        slotStatus: slotMeta.key,
        hasServerImage: Boolean(slotMeta.uri),
        hasLocalFile: hasLocalAsset,
        editable: isEditable,
      });
    }

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
                  (!canPromptUpload || isBusy) && styles.submitButtonDisabled,
                ]}
                onPress={() => promptImageSource(slot, groupMeta)}
                disabled={!canPromptUpload || isBusy}
              >
                <Text style={styles.uploadPrimaryText}>
                  {imageUri ? "Retake Current Selfie" : "Take Current Selfie"}
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
                  (!canPromptUpload || isBusy) && styles.submitButtonDisabled,
                ]}
                onPress={() => promptImageSource(slot, groupMeta)}
                disabled={!canPromptUpload || isBusy}
              >
                <Text style={styles.uploadPrimaryText}>
                  {imageUri ? "Replace" : "Upload"}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.uploadActionButton,
                styles.uploadDanger,
                removeDisabled && styles.submitButtonDisabled,
              ]}
              onPress={() => removeDocument(slot.keyName, slotMeta, groupMeta)}
              disabled={removeDisabled}
            >
              <Text style={styles.uploadDangerText}>
                {canRemoveSubmitted && !hasLocalAsset ? "Remove Submitted" : "Remove"}
              </Text>
            </TouchableOpacity>
          </View>

          {slotHelperText ? <Text style={styles.slotHelperText}>{slotHelperText}</Text> : null}

          {slotError ? <Text style={styles.slotErrorText}>{slotError}</Text> : null}
        </View>
      </View>
    );
  };

  const renderGroupCard = (groupConfig) => {
    const groupMeta = groupMetaMap[groupConfig.key];
    const expiryMeta = groupMeta.expiry || {};
    const validIdEquivalentActive = groupConfig.key === "validId" && validIdEquivalentDisplay.isEquivalentApproved;
    const validIdLicensePending = groupConfig.key === "validId" && validIdEquivalentDisplay.isEquivalentPending;
    const displayLabel =
      groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.label
        : groupMeta.label;
    const displayTone =
      groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.tone
        : groupMeta.tone;
    const [badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle] = getBadgeStyles(displayTone);
    const isBusy = submittingGroup === groupConfig.key;
    const hideUploads = groupConfig.key === "validId" && validIdEquivalentDisplay.hideUploadSlots;
    const levelValue =
      groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.levelValue
        : groupMeta.isApproved
        ? groupConfig.levelLabel
        : "Not yet approved";
    const summaryValue =
      groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.summaryValue
        : groupMeta.slots.front.hasDocument && groupMeta.slots.back.hasDocument
        ? "Front and back uploaded"
        : "Incomplete";
    const summarySubvalue =
      groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.summarySubvalue
        : `Selfie: ${
            documents[getCanonicalSelfieFieldName(groupConfig.key)] || groupMeta.slots.selfie.hasDocument
              ? "Captured"
              : "Missing"
          }`;
    const helperText =
      groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.helperText
        : "";
    const cardSubtitle =
      groupConfig.key === "validId" && validIdEquivalentActive
        ? "Driver's License already covers your with-driver identity requirement."
        : groupConfig.key === "validId" && validIdLicensePending
        ? "Driver's License review can satisfy your with-driver identity requirement once approved."
        : groupConfig.key === "validId"
        ? "Required slots: Valid ID front, Valid ID back, and current selfie."
        : "Required slots: Driver's License front, Driver's License back, and current selfie.";
    const showReadOnlyActionMessage =
      hideUploads ||
      ((!expiryMeta.renewalAllowed || !expiryMeta.isNearExpiry) &&
        (groupMeta.isApproved || groupMeta.isPending || isVerificationApproved(groupMeta.key) || isVerificationPending(groupMeta.key)));
    const readOnlyActionMessage = hideUploads
      ? "Driver's License satisfies this requirement."
      : groupMeta.isApproved || isVerificationApproved(groupMeta.key)
      ? "Verification approved."
      : "Submitted for review.";
    const submitEnabled =
      !hideUploads &&
      !isBusy &&
      (groupMeta.canEdit || (expiryMeta.renewalAllowed && (expiryMeta.isNearExpiry || expiryMeta.isExpired))) &&
      !(groupMeta.isPending || isVerificationPending(groupMeta.key));
    const expiryHelperText = expiryMeta.isExpired
      ? "This document appears to be expired. Please submit an updated document."
      : expiryMeta.isNearExpiry
      ? "This document is nearing expiry. You may need to renew it soon."
      : expiryMeta.expiryStatus === "valid"
      ? "Document is within valid date range."
      : "";
    const expiryTone = expiryMeta.isExpired ? "danger" : expiryMeta.isNearExpiry ? "warning" : "success";

    if (__DEV__) {
      console.log("[VerificationExpiry][computed]", {
        group: groupConfig.key,
        hasExpiryDate: Boolean(expiryMeta.expiryDate),
        expiryStatus: expiryMeta.expiryStatus || "unknown",
        daysRemaining: expiryMeta.daysRemaining,
        backendRequiresUpdate: Boolean(expiryMeta.backendRequiresUpdate),
      });
    }

    return (
      <View
        key={groupConfig.key}
        style={[styles.card, styles.highlightCard]}
      >
        <View style={styles.statusTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{groupConfig.title}</Text>
            <Text style={styles.cardSubtitle}>{cardSubtitle}</Text>
          </View>
          <View style={[badgeStyle, badgeToneStyle]}>
            <Text style={[badgeTextStyle, badgeTextToneStyle]}>{displayLabel}</Text>
          </View>
        </View>

        <View style={styles.levelRow}>
          <Text style={styles.summaryLabel}>Verification Level</Text>
          <Text style={styles.levelValue}>{levelValue}</Text>
        </View>

        <View style={styles.levelRow}>
          <Text style={styles.summaryLabel}>Verification Summary</Text>
          <Text style={styles.levelValue}>{summaryValue}</Text>
          {summarySubvalue ? <Text style={styles.summarySubvalue}>{summarySubvalue}</Text> : null}
        </View>

        <View style={styles.levelRow}>
          <Text style={styles.summaryLabel}>Expiry Date</Text>
          <Text style={styles.summaryValue}>
            {validIdEquivalentActive && !groupMeta.slots.front.hasDocument && !groupMeta.slots.back.hasDocument
              ? "No expiry shown"
              : formatExpiryDate(expiryMeta.expiryDate)}
          </Text>
          <Text style={styles.summarySubvalue}>
            Days Remaining: {expiryMeta.daysRemaining === null || expiryMeta.daysRemaining === undefined ? "Not available" : expiryMeta.daysRemaining}
          </Text>
          <Text style={styles.summarySubvalue}>
            Expiry Status: {validIdEquivalentActive && !groupMeta.slots.front.hasDocument && !groupMeta.slots.back.hasDocument ? "Not available" : expiryMeta.expiryLabel || "No expiry shown"}
          </Text>
        </View>

        {helperText ? (
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={20} color="#f97316" />
            <Text style={styles.noticeText}>{helperText}</Text>
          </View>
        ) : null}

        {expiryHelperText && !validIdEquivalentActive ? (
          <View
            style={[
              styles.noticeCard,
              expiryTone === "danger" && styles.noticeCardDanger,
              expiryTone === "warning" && styles.noticeCardWarning,
              expiryTone === "success" && styles.noticeCardSuccess,
            ]}
          >
            <Ionicons
              name={expiryTone === "danger" ? "alert-circle-outline" : "information-circle-outline"}
              size={20}
              color={expiryTone === "danger" ? "#DC2626" : expiryTone === "warning" ? "#f97316" : "#15803d"}
            />
            <Text
              style={[
                styles.noticeText,
                expiryTone === "danger" && styles.noticeTextDanger,
                expiryTone === "warning" && styles.noticeTextWarning,
                expiryTone === "success" && styles.noticeTextSuccess,
              ]}
            >
              {expiryHelperText}
            </Text>
          </View>
        ) : null}

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

        {!hideUploads ? (
          <View style={styles.uploadGrid}>
            {groupConfig.slots.map((slot) => renderUploadCard(groupMeta, slot))}
          </View>
        ) : (
          <View style={styles.levelRow}>
            <Text style={styles.summaryLabel}>Separate Valid ID Upload</Text>
            <Text style={styles.summaryValue}>
              Separate Valid ID upload is optional because your Driver's License is already approved.
            </Text>
          </View>
        )}

        {!showReadOnlyActionMessage ? (
          <TouchableOpacity
            style={[
              styles.submitButton,
              !submitEnabled && styles.submitButtonDisabled,
            ]}
            onPress={() => handleSubmitGroup(groupConfig)}
            disabled={!submitEnabled}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {expiryMeta.isNearExpiry && !expiryMeta.backendRequiresUpdate && !groupMeta.needsUpdate
                  ? "Update Document"
                  : groupMeta.isRejected || groupMeta.needsUpdate
                  ? `Resubmit ${groupConfig.title}`
                  : groupConfig.submitLabel}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.levelRow}>
            <Text style={styles.summaryLabel}>Verification Status</Text>
            <Text style={styles.summaryValue}>{readOnlyActionMessage}</Text>
          </View>
        )}
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
            <TouchableOpacity
              style={[
                styles.eligibilityCard,
                bookingEligibility.withDriver && styles.eligibilityCardActive,
                selectedVerificationGroup === "validId" && styles.eligibilityCardSelected,
              ]}
              onPress={() => setSelectedVerificationGroup("validId")}
              activeOpacity={0.9}
            >
              <Text style={styles.eligibilityLabel}>With Driver</Text>
              <Text style={styles.eligibilityValue}>
                {bookingEligibility.withDriver ? "Available" : bookingEligibility.withDriverLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.eligibilityCard,
                bookingEligibility.selfDrive && styles.eligibilityCardActive,
                selectedVerificationGroup === "license" && styles.eligibilityCardSelected,
              ]}
              onPress={() => setSelectedVerificationGroup("license")}
              activeOpacity={0.9}
            >
              <Text style={styles.eligibilityLabel}>Self-Drive</Text>
              <Text style={styles.eligibilityValue}>
                {bookingEligibility.selfDrive ? "Available" : bookingEligibility.selfDriveLabel}
              </Text>
            </TouchableOpacity>
          </View>
          {bookingEligibility.withDriverStatus === "available" && bookingEligibility.withDriverSource === "license" ? (
            <Text style={styles.slotHelperText}>
              Driver's License also satisfies valid ID eligibility.
            </Text>
          ) : null}
        </View>

        {visibleGroupConfig ? renderGroupCard(visibleGroupConfig) : null}

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
