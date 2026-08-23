import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DocumentCaptureModal from "../components/DocumentCaptureModal";
import DocumentExampleModal from "../components/DocumentExampleModal";
import FaceCaptureModal, {
  deleteTemporarySelfieFile,
} from "../components/FaceCaptureModal";
import VerificationCaptureRow from "../components/VerificationCaptureRow";
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
    title: "Government ID",
    levelLabel: "Basic Verified",
    submitLabel: "Submit Valid ID Verification",
    verificationType: "with_driver",
    slots: [
      {
        keyName: "validIdFront",
        slotKey: "front",
        title: "Required Front",
        hint: "Front of your government-issued ID.",
        sourcePrompt: "Upload Valid ID front",
      },
      {
        keyName: "validIdBack",
        slotKey: "back",
        title: "Required Back",
        hint: "Back of the same government-issued ID.",
        sourcePrompt: "Upload Valid ID back",
      },
      {
        keyName: "validIdSelfie",
        slotKey: "selfie",
        title: "Face Verification",
        hint: "Take a clear current selfie for identity review.",
        sourcePrompt: "Take Current Selfie",
        prefersCamera: true,
      },
    ],
  },
  {
    key: "license",
    title: "Driver's License",
    levelLabel: "Fully Verified",
    submitLabel: "Submit Driver's License Verification",
    verificationType: "self_drive",
    slots: [
      {
        keyName: "licenseFront",
        slotKey: "front",
        title: "Required Front",
        hint: "Front of your Driver's License.",
        sourcePrompt: "Upload license front",
      },
      {
        keyName: "licenseBack",
        slotKey: "back",
        title: "Required Back",
        hint: "Back of the same Driver's License.",
        sourcePrompt: "Upload license back",
      },
      {
        keyName: "licenseSelfie",
        slotKey: "selfie",
        title: "Face Verification",
        hint: "Take a clear current selfie for identity review.",
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
  if (["draft", "on_file"].includes(statusKey)) return "info";
  if (statusKey === "submission_incomplete") return "danger";
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
    const hasServerSubmission = Object.values(groupMeta?.slots || {}).some(
      (slot) => Boolean(slot?.uri)
    );
    return {
      key: "draft",
      label: hasServerSubmission ? "Ready to Resubmit" : "Ready to Submit",
    };
  }

  if (isVerificationPending(groupMeta.key)) {
    return slotMeta.uri
      ? { key: "under_review", label: "Under Review" }
      : { key: "submission_incomplete", label: "Submission incomplete" };
  }

  if (isVerificationApproved(groupMeta.key)) {
    return slotMeta.uri
      ? { key: "approved", label: "Approved" }
      : { key: "submission_incomplete", label: "Submission incomplete" };
  }

  if (groupMeta.isRejected || groupMeta.needsUpdate || isVerificationRejected(groupMeta.key)) {
    return { key: "needs_update", label: "Needs Update" };
  }

  if (isVerificationApproved(slotMeta.key)) {
    return { key: "approved", label: "Approved" };
  }

  if (isVerificationPending(slotMeta.key)) {
    return { key: "under_review", label: "Under Review" };
  }

  if (isVerificationRejected(slotMeta.key)) {
    return { key: "needs_update", label: "Needs Update" };
  }

  if (slotMeta.uri) {
    return { key: "on_file", label: "On file" };
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
  const [screenFocused, setScreenFocused] = useState(false);
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === "active");
  const [faceCaptureVisible, setFaceCaptureVisible] = useState(false);
  const [documentCaptureSlot, setDocumentCaptureSlot] = useState(null);
  const [exampleSide, setExampleSide] = useState("");
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const requestGenerationRef = useRef(0);
  const activeStatusRequestRef = useRef(null);
  const storageSyncRef = useRef(Promise.resolve());
  const documentsRef = useRef(INITIAL_DOCUMENTS);
  const requestedType = route?.params?.verificationType || "";

  const invalidateStatusRequest = useCallback(() => {
    requestGenerationRef.current += 1;
    activeStatusRequestRef.current?.controller?.abort?.();
    activeStatusRequestRef.current = null;
  }, []);

  const loadVerification = useCallback(async (mode = "load", options = {}) => {
    const force = Boolean(options.force);
    const silent = Boolean(options.silent);

    if (activeStatusRequestRef.current && !force) {
      return activeStatusRequestRef.current.promise;
    }

    if (force) {
      invalidateStatusRequest();
    }

    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    const controller = typeof AbortController === "function" ? new AbortController() : null;

    const requestPromise = (async () => {
      try {
        if (!silent && mode === "refresh") {
          setRefreshing(true);
        } else if (!silent && mode !== "refresh") {
          setLoading(true);
        }

        if (!silent) setError("");
        const data = await getVerificationStatus({ signal: controller?.signal });

        if (!mountedRef.current || generation !== requestGenerationRef.current) {
          return null;
        }

        setVerification(data || null);

        if (__DEV__) {
          console.log("[VerificationData][serverFields]", getVerificationServerFieldDebug(data || {}));
        }

        storageSyncRef.current = storageSyncRef.current
          .catch(() => {})
          .then(async () => {
            if (!mountedRef.current || generation !== requestGenerationRef.current) return;
            const rawUser = await AsyncStorage.getItem("clientUser");
            if (!rawUser || generation !== requestGenerationRef.current) return;

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
          });

        try {
          await storageSyncRef.current;
        } catch {
          // Keep screen usable if stored data is malformed.
        }

        return data || null;
      } catch (err) {
        if (
          controller?.signal?.aborted ||
          err?.code === "ERR_CANCELED" ||
          err?.name === "CanceledError" ||
          generation !== requestGenerationRef.current
        ) {
          return null;
        }

        if (isUnauthorizedError(err)) {
          await clearClientSession();
          navigation.replace("ClientLogin");
          return null;
        }

        if (!silent && mountedRef.current) {
          setError(err?.response?.data?.message || "Failed to load verification.");
        }
        return null;
      } finally {
        if (mountedRef.current && generation === requestGenerationRef.current) {
          setLoading(false);
          setRefreshing(false);
          activeStatusRequestRef.current = null;
        }
      }
    })();

    activeStatusRequestRef.current = {
      controller,
      generation,
      promise: requestPromise,
    };

    return requestPromise;
  }, [invalidateStatusRequest, navigation]);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      invalidateStatusRequest();
      Object.values(documentsRef.current || {}).forEach((asset) => {
        if (asset?.temporaryCameraFile) {
          deleteTemporarySelfieFile(asset.uri);
        }
      });
    };
  }, [invalidateStatusRequest]);

  useEffect(() => {
    const handleFocus = () => {
      if (focusedRef.current) return;
      focusedRef.current = true;
      setScreenFocused(true);
      loadVerification("load", { force: true });
    };
    const handleBlur = () => {
      focusedRef.current = false;
      setScreenFocused(false);
      invalidateStatusRequest();
    };
    const unsubscribeFocus = navigation.addListener("focus", handleFocus);
    const unsubscribeBlur = navigation.addListener("blur", handleBlur);

    if (navigation.isFocused?.() !== false) {
      handleFocus();
    }

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      focusedRef.current = false;
      invalidateStatusRequest();
    };
  }, [invalidateStatusRequest, loadVerification, navigation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasInactive = appStateRef.current !== "active";
      appStateRef.current = nextState;
      const isActive = nextState === "active";
      setAppIsActive(isActive);

      if (isActive && wasInactive && focusedRef.current) {
        loadVerification("refresh", { force: true });
      } else if (!isActive) {
        invalidateStatusRequest();
      }
    });

    return () => subscription.remove();
  }, [invalidateStatusRequest, loadVerification]);

  const statusLabel = useMemo(() => getVerificationBadgeLabel(verification), [verification]);
  const statusTone = useMemo(() => getVerificationStatusTone(verification), [verification]);
  const bookingEligibility = useMemo(() => getBookingEligibility(verification), [verification]);
  const validIdMeta = useMemo(() => getVerificationGroupMeta(verification, "validId"), [verification]);
  const licenseMeta = useMemo(() => getVerificationGroupMeta(verification, "license"), [verification]);
  const hasPendingReview =
    validIdMeta.isPending ||
    licenseMeta.isPending ||
    isVerificationPending(
      verification?.overallVerificationStatus ||
        verification?.overallStatus ||
        verification?.verificationStatus ||
        verification?.status
    );
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

  useEffect(() => {
    if (!screenFocused || !appIsActive || !hasPendingReview || submittingGroup) return undefined;

    const interval = setInterval(() => {
      loadVerification("refresh", { silent: true });
    }, 25000);

    return () => clearInterval(interval);
  }, [appIsActive, hasPendingReview, loadVerification, screenFocused, submittingGroup]);

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
      setFaceCaptureVisible(true);
      return;
    }

    Alert.alert(slot.sourcePrompt, "Choose how you want to add the image.", [
      {
        text: "Camera",
        onPress: () =>
          setDocumentCaptureSlot({
            keyName: slot.keyName,
            side: slot.slotKey,
            documentLabel:
              group.groupKey === "license" ? "Driver's License" : "Government ID",
          }),
      },
      { text: "Gallery", onPress: () => openPicker(slot.keyName, "gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const discardLocalDraft = async (keyName) => {
    const localAsset = documents[keyName];
    if (!localAsset) return;

    if (localAsset.temporaryCameraFile) {
      await deleteTemporarySelfieFile(localAsset.uri);
    }

    setDocuments((prev) => ({ ...prev, [keyName]: null }));
    clearSlotError(keyName);
  };

  const removeSubmittedDocument = (keyName, slotMeta, groupMeta) => {
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

    if (!slotMeta.uri) return;

    Alert.alert(
      "Remove this submitted document?",
      "This removes the server copy. You will need to select a replacement before submitting again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setSubmittingGroup(groupMeta.groupKey);
              setError("");
              invalidateStatusRequest();
              await removeVerificationDocument(keyName);
              await discardLocalDraft(keyName);
              await loadVerification("refresh", { force: true });
            } catch (err) {
              if (isUnauthorizedError(err)) {
                await handleUnauthorized();
                return;
              }

              setError(err?.response?.data?.message || "Failed to remove document.");
            } finally {
              setSubmittingGroup("");
            }
          },
        },
      ]
    );
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

  const clearGroupLocalDocuments = async (groupConfig, submittedLocalDocuments = {}) => {
    await Promise.all(
      Object.values(submittedLocalDocuments).map((asset) =>
        asset?.temporaryCameraFile
          ? deleteTemporarySelfieFile(asset.uri)
          : Promise.resolve()
      )
    );
    setDocuments((prev) => ({
      ...prev,
      [groupConfig.slots[0].keyName]: null,
      [groupConfig.slots[1].keyName]: null,
      [groupConfig.slots[2].keyName]: null,
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

    const hasLocalChanges = groupConfig.slots.some(
      (slot) => Boolean(documents[slot.keyName])
    );
    if (!hasLocalChanges) {
      setError("Select or capture a replacement before submitting verification.");
      return false;
    }

    const validationError = validateGroupSubmission(groupConfig, groupMeta);
    if (validationError) {
      setSlotErrors({ [validationError.field]: validationError.message });
      setError("");
      return false;
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
      invalidateStatusRequest();
      const submitResult = await submitVerification(payload);
      if (__DEV__) {
        console.log("[Verification][resubmit-response]", {
          group: groupConfig.key,
          requestSucceeded: true,
          serverStatus:
            groupConfig.key === "validId"
              ? submitResult?.validIdStatus || submitResult?.overallVerificationStatus || ""
              : submitResult?.driverLicenseStatus ||
                submitResult?.licenseStatus ||
                submitResult?.overallVerificationStatus ||
                "",
          hasReturnedSelfie: Boolean(
            submitResult?.validIdSelfieUrl || submitResult?.licenseSelfieUrl
          ),
        });
      }
      await clearGroupLocalDocuments(groupConfig, submittedLocalDocuments);
      const refreshedVerification = await loadVerification("refresh", { force: true });
      if (__DEV__) {
        const refreshedGroup = getVerificationGroupMeta(
          refreshedVerification,
          groupConfig.key
        );
        console.log("[Verification][resubmit-refresh]", {
          group: groupConfig.key,
          serverStatus: refreshedGroup.key,
          hasServerSelfie: Boolean(refreshedGroup.slots.selfie.uri),
        });
      }

      setSlotErrors({});
      Alert.alert("Submitted", `${groupConfig.title} was submitted for admin review.`);
      return true;
    } catch (err) {
      if (__DEV__) {
        console.log("[Verification][resubmit-response]", {
          group: groupConfig.key,
          requestSucceeded: false,
          httpStatus: err?.response?.status || null,
          errorCode: err?.code || "",
        });
      }

      if (isUnauthorizedError(err)) {
        await handleUnauthorized();
        return false;
      }

      const submitMessage = err?.response?.data?.message || "Failed to submit verification.";
      if (submitMessage === "Face verification photo is required.") {
        setSlotErrors({
          [groupConfig.slots[2].keyName]: "Please take a current selfie for verification.",
        });
        setError("");
        return false;
      }

      setError(submitMessage);
      return false;
    } finally {
      setSubmittingGroup("");
    }
  };

  const handleUseCapturedSelfie = async (asset) => {
    if (!asset || !visibleGroupConfig || !visibleGroupMeta || submittingGroup) {
      return false;
    }

    const selfieKeyName = getCanonicalSelfieFieldName(visibleGroupConfig.key);
    const previousAsset = documents[selfieKeyName];
    if (
      previousAsset?.temporaryCameraFile &&
      previousAsset.uri &&
      previousAsset.uri !== asset.uri
    ) {
      await deleteTemporarySelfieFile(previousAsset.uri);
    }

    setDocuments((prev) => ({ ...prev, [selfieKeyName]: asset }));
    clearSlotError(selfieKeyName);
    setError("");
    return true;
  };

  const handleUseCapturedDocument = async (asset) => {
    const keyName = documentCaptureSlot?.keyName;
    if (!asset || !keyName || submittingGroup) return false;

    const previousAsset = documents[keyName];
    if (
      previousAsset?.temporaryCameraFile &&
      previousAsset.uri &&
      previousAsset.uri !== asset.uri
    ) {
      await deleteTemporarySelfieFile(previousAsset.uri);
    }

    setDocuments((prev) => ({ ...prev, [keyName]: asset }));
    clearSlotError(keyName);
    setError("");
    return true;
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
    const canRemoveSubmitted = Boolean(slotMeta.uri) && isEditable && !isBusy;
    const canPromptUpload = isEditable && !isBusy;
    const slotError = slotErrors[slot.keyName];
    const groupHasServerSubmission = Object.values(groupMeta.slots).some(
      (groupSlot) => Boolean(groupSlot.uri)
    );
    const slotHelperText = hasLocalAsset
      ? groupHasServerSubmission
        ? "New replacement selected. Tap Resubmit Verification to send your changes."
        : "New file selected. Tap Submit Verification to send your changes."
      : renewalEditable
      ? "You can update this document because renewal is available."
      : slotStatus.key === "submission_incomplete"
      ? "Submission information is incomplete. Refresh or contact support."
      : slotStatus.key === "approved"
      ? "This document has been approved and is locked."
      : slotStatus.key === "under_review"
      ? "Your document is submitted and waiting for admin review."
      : slotStatus.key === "on_file"
      ? "A document is on file. Its review status has not been submitted by the server."
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
      <VerificationCaptureRow
        key={slot.keyName}
        title={slot.title}
        hint={slot.hint}
        imageUri={imageUri}
        isSelfie={slot.slotKey === "selfie"}
        statusLabel={slotLabel}
        statusStyles={[badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle]}
        hasLocalAsset={hasLocalAsset}
        isBusy={isBusy}
        canChange={canPromptUpload}
        canRemoveSubmitted={canRemoveSubmitted}
        helperText={slotHelperText}
        remark={slotMeta.remarks}
        error={slotError}
        onChange={() => promptImageSource(slot, groupMeta)}
        onDiscard={() => discardLocalDraft(slot.keyName)}
        onRemoveSubmitted={() => removeSubmittedDocument(slot.keyName, slotMeta, groupMeta)}
        onViewExample={() => setExampleSide(slot.slotKey)}
      />
    );
  };

  const renderGroupCard = (groupConfig) => {
    const groupMeta = groupMetaMap[groupConfig.key];
    const expiryMeta = groupMeta.expiry || {};
    const validIdEquivalentActive = groupConfig.key === "validId" && validIdEquivalentDisplay.isEquivalentApproved;
    const validIdLicensePending = groupConfig.key === "validId" && validIdEquivalentDisplay.isEquivalentPending;
    const serverDisplayLabel =
      groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.label
        : groupMeta.label;
    const serverDisplayTone =
      groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.tone
        : groupMeta.tone;
    const localDraftCount = groupConfig.slots.filter((slot) => Boolean(documents[slot.keyName])).length;
    const hasLocalDrafts = localDraftCount > 0;
    const serverFrontUri = Boolean(groupMeta.slots.front.uri);
    const serverBackUri = Boolean(groupMeta.slots.back.uri);
    const serverSelfieUri = Boolean(groupMeta.slots.selfie.uri);
    const localFrontDraft = Boolean(documents[groupConfig.slots[0].keyName]);
    const localBackDraft = Boolean(documents[groupConfig.slots[1].keyName]);
    const localSelfieDraft = Boolean(documents[groupConfig.slots[2].keyName]);
    const hasFront = localFrontDraft || serverFrontUri;
    const hasBack = localBackDraft || serverBackUri;
    const hasSelfie = localSelfieDraft || serverSelfieUri;
    const hasServerSubmission = serverFrontUri || serverBackUri || serverSelfieUri;
    const serverGroupComplete = serverFrontUri && serverBackUri && serverSelfieUri;
    const effectiveGroupComplete = hasFront && hasBack && hasSelfie;
    const serverIsPending = groupMeta.isPending || isVerificationPending(groupMeta.key);
    const hasInconsistentServerState = serverIsPending && !serverGroupComplete;
    const isGroupLocked = serverIsPending && serverGroupComplete;
    const isBusy = submittingGroup === groupConfig.key;
    const renewalEditable =
      Boolean(expiryMeta.renewalAllowed) &&
      Boolean(expiryMeta.isNearExpiry || expiryMeta.isExpired);
    const canEdit = groupMeta.canEdit || renewalEditable;
    const canResubmit = hasLocalDrafts && effectiveGroupComplete && !isBusy;
    const displayLabel = hasLocalDrafts ? "Changes Pending" : serverDisplayLabel;
    const displayTone = hasLocalDrafts ? "info" : serverDisplayTone;
    const [badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle] = getBadgeStyles(displayTone);
    const hideUploads =
      !hasLocalDrafts &&
      groupConfig.key === "validId" &&
      validIdEquivalentDisplay.hideUploadSlots;
    const levelValue =
      groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.levelValue
        : groupMeta.isApproved
        ? groupConfig.levelLabel
        : "Not yet approved";
    const summaryValue =
      hasLocalDrafts
        ? effectiveGroupComplete
          ? "Draft package complete"
          : "Draft package incomplete"
        : groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.summaryValue
        : groupMeta.slots.front.hasDocument && groupMeta.slots.back.hasDocument
        ? "Front and back uploaded"
        : "Incomplete";
    const summarySubvalue =
      hasLocalDrafts
        ? `${localDraftCount} local change${localDraftCount === 1 ? "" : "s"} not submitted`
        : groupConfig.key === "validId" && (validIdEquivalentActive || validIdLicensePending)
        ? validIdEquivalentDisplay.summarySubvalue
        : `Selfie: ${groupMeta.slots.selfie.hasDocument ? "Submitted" : "Missing"}`;
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
      !hasLocalDrafts &&
      (hideUploads ||
      ((!expiryMeta.renewalAllowed || !expiryMeta.isNearExpiry) &&
        (groupMeta.isApproved || groupMeta.isPending || isVerificationApproved(groupMeta.key) || isVerificationPending(groupMeta.key))));
    const readOnlyActionMessage = hideUploads
      ? "Driver's License satisfies this requirement."
      : groupMeta.isApproved || isVerificationApproved(groupMeta.key)
      ? "Verification approved."
      : "Submitted for review.";
    const submitEnabled = !hideUploads && !isBusy && canResubmit;
    const expiryHelperText = expiryMeta.isExpired
      ? "This document appears to be expired. Please submit an updated document."
      : expiryMeta.isNearExpiry
      ? "This document is nearing expiry. You may need to renew it soon."
      : expiryMeta.expiryStatus === "valid"
      ? "Document is within valid date range."
      : "";
    const expiryTone = expiryMeta.isExpired ? "danger" : expiryMeta.isNearExpiry ? "warning" : "success";

    if (__DEV__) {
      console.log("[Verification][resubmit-state]", {
        verificationType: groupConfig.verificationType,
        hasAnyDraft: Object.values(documents).some(Boolean),
        hasLocalDrafts,
        effectiveGroupComplete,
        hasFront,
        hasBack,
        hasSelfie,
        serverFrontUri,
        serverBackUri,
        serverSelfieUri,
        localFrontDraft,
        localBackDraft,
        localSelfieDraft,
        serverStatus: groupMeta.key,
        previousServerStatus: serverDisplayLabel,
        isPending: serverIsPending,
        isUnderReview: serverIsPending,
        isGroupLocked,
        isEditable: canEdit,
        canSubmit: canResubmit,
        canResubmit,
        isSubmitting: isBusy,
      });

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

        <View style={styles.compactGroupSummary}>
          <View style={styles.compactSummaryRow}>
            <Text style={styles.compactSummaryLabel}>Level</Text>
            <Text style={styles.compactSummaryValue}>{levelValue}</Text>
          </View>
          <View style={styles.compactSummaryRow}>
            <Text style={styles.compactSummaryLabel}>Package</Text>
            <View style={styles.compactSummaryValueWrap}>
              <Text style={styles.compactSummaryValue}>{summaryValue}</Text>
              {summarySubvalue ? (
                <Text style={styles.compactSummaryDetail}>{summarySubvalue}</Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.compactSummaryRow, styles.compactSummaryRowLast]}>
            <Text style={styles.compactSummaryLabel}>Expiry</Text>
            <View style={styles.compactSummaryValueWrap}>
              <Text style={styles.compactSummaryValue}>
                {validIdEquivalentActive &&
                !groupMeta.slots.front.hasDocument &&
                !groupMeta.slots.back.hasDocument
                  ? "No expiry shown"
                  : formatExpiryDate(expiryMeta.expiryDate)}
              </Text>
              <Text style={styles.compactSummaryDetail}>
                {validIdEquivalentActive &&
                !groupMeta.slots.front.hasDocument &&
                !groupMeta.slots.back.hasDocument
                  ? "Not available"
                  : expiryMeta.expiryLabel || "No expiry shown"}
              </Text>
            </View>
          </View>
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
          <View style={[styles.groupActionPanel, hasLocalDrafts && styles.groupActionPanelPending]}>
            {hasLocalDrafts ? (
              <View style={styles.groupActionMessage}>
                <Ionicons name="cloud-upload-outline" size={22} color="#1d4ed8" />
                <View style={styles.groupActionMessageBody}>
                  <Text style={styles.groupActionTitle}>Changes Pending</Text>
                  <Text style={styles.groupActionText}>
                    Your replacement has not been submitted yet.
                  </Text>
                  <Text style={styles.groupActionServerStatus}>
                    Previous server status: {serverDisplayLabel}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.groupActionText}>
                {effectiveGroupComplete
                  ? "Select a replacement to create a new submission."
                  : "Add all required images to enable verification submission."}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                !submitEnabled && styles.submitButtonDisabled,
              ]}
              onPress={() => handleSubmitGroup(groupConfig)}
              disabled={!submitEnabled}
            >
              {isBusy ? (
                <View style={styles.submitButtonBusyContent}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.submitButtonText}>Submitting verification...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>
                  {hasServerSubmission ? "Resubmit Verification" : "Submit Verification"}
                </Text>
              )}
            </TouchableOpacity>

            {hasLocalDrafts && !effectiveGroupComplete ? (
              <Text style={styles.groupActionRequirement}>
                Add the missing required image before resubmitting.
              </Text>
            ) : null}
            {hasLocalDrafts && hasInconsistentServerState ? (
              <Text style={styles.groupActionError}>
                Server status is Pending Review, but a required server image is missing. Refresh the screen before trying again.
              </Text>
            ) : null}
          </View>
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

  const hasAnyLocalChanges = Object.values(documents).some(Boolean);
  const summaryStatusLabel = hasAnyLocalChanges ? "Changes Pending" : statusLabel;
  const summaryStatusTone = hasAnyLocalChanges ? "info" : statusTone;
  const [badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle] = getBadgeStyles(summaryStatusTone);

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
            onPress={() => loadVerification("refresh", { force: true })}
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
              <Text style={[badgeTextStyle, badgeTextToneStyle]}>{summaryStatusLabel}</Text>
            </View>
          </View>

          {hasAnyLocalChanges ? (
            <View style={styles.draftSummaryNotice}>
              <Ionicons name="information-circle-outline" size={20} color="#1d4ed8" />
              <Text style={styles.draftSummaryNoticeText}>
                You have local changes that have not been submitted. Server statuses below describe the previous submission.
              </Text>
            </View>
          ) : null}

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
      <FaceCaptureModal
        visible={faceCaptureVisible}
        onCancel={() => setFaceCaptureVisible(false)}
        onUsePhoto={handleUseCapturedSelfie}
      />
      <DocumentCaptureModal
        visible={Boolean(documentCaptureSlot)}
        documentLabel={documentCaptureSlot?.documentLabel}
        side={documentCaptureSlot?.side}
        onCancel={() => setDocumentCaptureSlot(null)}
        onUsePhoto={handleUseCapturedDocument}
      />
      <DocumentExampleModal
        visible={Boolean(exampleSide)}
        side={exampleSide || "front"}
        onClose={() => setExampleSide("")}
      />
    </SafeAreaView>
  );
}
