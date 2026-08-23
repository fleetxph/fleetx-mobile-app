import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

export async function deleteTemporarySelfieFile(uri) {
  if (!uri || !String(uri).startsWith("file:")) return;

  try {
    await LegacyFileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Cache cleanup must never block cancellation or submission.
  }
}

export default function FaceCaptureModal({ visible, onCancel, onUsePhoto }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const photoRef = useRef(null);
  const transferredUriRef = useRef("");
  const permissionRequestedRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [usingPhoto, setUsingPhoto] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const shutterSize = 82;
  const captureBottom = Math.max(safeAreaInsets.bottom + 12, 28);
  const shutterTop = screenHeight - captureBottom - shutterSize;
  const silhouetteTop = Math.max(safeAreaInsets.top + 20, screenHeight * 0.05);
  const silhouetteHeight = screenWidth * 1.6;
  const holdInstructionTop = silhouetteTop + silhouetteHeight * 0.31;
  const cardGuideWidth = Math.min(screenWidth * 0.64, 300);
  const cardGuideHeight = Math.min(Math.max(screenHeight * 0.14, 88), 126);
  const cardGuideTop = shutterTop - cardGuideHeight - 22;
  const bracketSize = Math.min(cardGuideWidth * 0.16, 38);

  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);

  useEffect(() => {
    if (!visible) return;

    transferredUriRef.current = "";
    permissionRequestedRef.current = false;
    setCameraError("");
    setCameraReady(false);
  }, [visible]);

  useEffect(() => {
    if (
      visible &&
      permission &&
      !permission.granted &&
      permission.canAskAgain &&
      !permissionRequestedRef.current
    ) {
      permissionRequestedRef.current = true;
      requestPermission().catch(() => {});
    }
  }, [permission, requestPermission, visible]);

  useEffect(
    () => () => {
      const pendingPhoto = photoRef.current;
      if (pendingPhoto?.uri && pendingPhoto.uri !== transferredUriRef.current) {
        deleteTemporarySelfieFile(pendingPhoto.uri);
      }
    },
    []
  );

  const closeCapture = async () => {
    if (capturing || usingPhoto) return;
    await deleteTemporarySelfieFile(photo?.uri);
    photoRef.current = null;
    setPhoto(null);
    onCancel?.();
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || !cameraReady || capturing || usingPhoto) return;

    try {
      setCapturing(true);
      setCameraError("");
      const result = await cameraRef.current.takePictureAsync({
        base64: true,
        exif: false,
        quality: 0.5,
        skipProcessing: false,
      });

      if (!result?.uri || !result?.base64) {
        throw new Error("The camera did not return a usable photo.");
      }

      const nextPhoto = {
        uri: result.uri,
        base64: result.base64,
        mimeType: "image/jpeg",
        temporaryCameraFile: true,
      };
      photoRef.current = nextPhoto;
      setPhoto(nextPhoto);
    } catch (error) {
      setCameraError(error?.message || "Unable to capture the selfie. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  const retakePhoto = async () => {
    if (usingPhoto) return;
    await deleteTemporarySelfieFile(photo?.uri);
    photoRef.current = null;
    setPhoto(null);
    setCameraError("");
  };

  const usePhoto = async () => {
    if (!photo || usingPhoto || capturing) return;

    try {
      setUsingPhoto(true);
      setCameraError("");
      const accepted = await onUsePhoto?.(photo);
      if (accepted === false) return;

      transferredUriRef.current = photo.uri;
      photoRef.current = null;
      setPhoto(null);
      onCancel?.();
    } catch (error) {
      setCameraError(error?.message || "Unable to use this selfie. Please try again.");
    } finally {
      setUsingPhoto(false);
    }
  };

  const renderPermissionState = () => {
    if (!permission) {
      return (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.stateText}>Checking camera access...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centeredState}>
          <Ionicons name="camera-outline" size={54} color="#f97316" />
          <Text style={styles.stateTitle}>Camera access is required</Text>
          <Text style={styles.stateText}>
            FleetX needs camera access to take your current verification selfie.
          </Text>
          {permission.canAskAgain ? (
            <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Allow Camera</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={() => Linking.openSettings()}>
              <Text style={styles.primaryButtonText}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (photo) {
      return (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.previewShade} pointerEvents="none" />
          <View style={styles.previewContent}>
            <Text style={styles.previewTitle}>Review your selfie</Text>
            <Text style={styles.previewInstruction}>
              Make sure your face is clear, centered, and well lit.
            </Text>
            {cameraError ? <Text style={styles.errorText}>{cameraError}</Text> : null}
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, usingPhoto && styles.buttonDisabled]}
                onPress={retakePhoto}
                disabled={usingPhoto}
              >
                <Text style={styles.secondaryButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, styles.usePhotoButton, usingPhoto && styles.buttonDisabled]}
                onPress={usePhoto}
                disabled={usingPhoto}
              >
                {usingPhoto ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Use Photo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="picture"
          onCameraReady={() => setCameraReady(true)}
          onMountError={(event) =>
            setCameraError(event?.message || "Unable to start the front camera.")
          }
        />

        <View style={styles.cameraShade} pointerEvents="none" />

        <Svg
          width={screenWidth}
          height={silhouetteHeight}
          viewBox="0 0 1000 1600"
          preserveAspectRatio="xMidYMid meet"
          style={[styles.silhouetteSvg, { top: silhouetteTop }]}
          pointerEvents="none"
        >
          <Path
            d="M500 130 C292 130 138 242 130 420 C127 474 130 525 126 572 C82 598 57 650 67 710 C77 765 108 802 158 820 C177 894 225 984 304 1060 C340 1095 360 1127 355 1162 C352 1195 337 1222 306 1248 C232 1310 118 1348 0 1368 L0 1600 L1000 1600 L1000 1368 C882 1348 768 1310 694 1248 C663 1222 648 1195 645 1162 C640 1127 660 1095 696 1060 C775 984 823 894 842 820 C892 802 923 765 933 710 C943 650 918 598 874 572 C870 525 873 474 870 420 C862 242 708 130 500 130 Z"
            fill="#f1f1ed"
            fillOpacity={0.28}
          />
        </Svg>

        <View
          style={[
            styles.holdIdInstruction,
            { top: holdInstructionTop },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.holdIdInstructionText}>Please hold your ID card</Text>
        </View>

        <View
          style={[
            styles.cardGuide,
            {
              top: cardGuideTop,
              left: (screenWidth - cardGuideWidth) / 2,
              width: cardGuideWidth,
              height: cardGuideHeight,
            },
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.cardCorner,
              styles.cardCornerTopLeft,
              { width: bracketSize, height: bracketSize },
            ]}
          />
          <View
            style={[
              styles.cardCorner,
              styles.cardCornerTopRight,
              { width: bracketSize, height: bracketSize },
            ]}
          />
          <Text style={styles.cardGuideText}>Your ID card</Text>
          <View
            style={[
              styles.cardCorner,
              styles.cardCornerBottomLeft,
              { width: bracketSize, height: bracketSize },
            ]}
          />
          <View
            style={[
              styles.cardCorner,
              styles.cardCornerBottomRight,
              { width: bracketSize, height: bracketSize },
            ]}
          />
        </View>

        {cameraError ? (
          <Text style={[styles.captureError, { bottom: captureBottom + shutterSize + 14 }]}>
            {cameraError}
          </Text>
        ) : null}

        <View style={[styles.captureControls, { bottom: captureBottom }]}>
          <TouchableOpacity
            accessibilityLabel="Capture selfie"
            style={[
              styles.shutterOuter,
              (!cameraReady || capturing) && styles.buttonDisabled,
            ]}
            onPress={capturePhoto}
            disabled={!cameraReady || capturing}
          >
            {capturing ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeCapture}
    >
      <View style={styles.root}>
        {renderPermissionState()}
        <SafeAreaView style={styles.headerSafeArea} pointerEvents="box-none">
          <View style={styles.header} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.headerButton}
              onPress={closeCapture}
              disabled={capturing || usingPhoto}
              accessibilityLabel="Close face verification camera"
            >
              <Ionicons name="close" size={27} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#05080d",
  },
  headerSafeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -6,
  },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
  },
  cameraShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 7, 18, 0.18)",
  },
  silhouetteSvg: {
    position: "absolute",
    left: 0,
  },
  holdIdInstruction: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
  },
  holdIdInstructionText: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "500",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardGuide: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  cardGuideText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "500",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardCorner: {
    position: "absolute",
    borderColor: "#ffffff",
  },
  cardCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cardCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cardCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cardCornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  captureControls: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  shutterOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#ffffff",
  },
  captureError: {
    position: "absolute",
    left: 24,
    right: 24,
    borderRadius: 10,
    padding: 10,
    overflow: "hidden",
    backgroundColor: "rgba(127, 29, 29, 0.9)",
    color: "#ffffff",
    textAlign: "center",
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  stateTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 18,
    textAlign: "center",
  },
  stateText: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 22,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 48,
    minWidth: 150,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#05080d",
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  previewShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 7, 18, 0.22)",
  },
  previewContent: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 30,
    paddingTop: 18,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  previewTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  previewInstruction: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  previewActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5, 8, 13, 0.42)",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  usePhotoButton: {
    flex: 1,
    minWidth: 0,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
  },
});
