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
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

export async function deleteTemporarySelfieFile(uri) {
  if (!uri || !String(uri).startsWith("file:")) return;

  try {
    await LegacyFileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Cache cleanup must never block cancellation or submission.
  }
}

export default function FaceCaptureModal({ visible, onCancel, onUsePhoto }) {
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

        <View style={styles.guideOverlay} pointerEvents="none">
          <View style={styles.topShade} />
          <View style={styles.guideRow}>
            <View style={styles.sideShade} />
            <View style={styles.faceOval} />
            <View style={styles.sideShade} />
          </View>
          <View style={styles.bottomShade} />
        </View>

        <View style={styles.captureInstructions} pointerEvents="none">
          <Text style={styles.captureTitle}>Position your face inside the oval</Text>
          <Text style={styles.captureSubtitle}>
            Keep your face centered and look directly at the camera.
          </Text>
          <Text style={styles.guidanceDisclaimer}>Guided photo capture</Text>
        </View>

        {cameraError ? <Text style={styles.captureError}>{cameraError}</Text> : null}

        <View style={styles.captureControls}>
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={closeCapture}
            disabled={capturing || usingPhoto}
          >
            <Ionicons name="chevron-back" size={26} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Face Capture</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.body}>{renderPermissionState()}</View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#05080d",
  },
  header: {
    height: 58,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#05080d",
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    backgroundColor: "#05080d",
  },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topShade: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.58)",
  },
  guideRow: {
    height: 360,
    flexDirection: "row",
  },
  sideShade: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.58)",
  },
  faceOval: {
    width: 274,
    height: 360,
    borderRadius: 137,
    borderWidth: 4,
    borderColor: "#ffffff",
    backgroundColor: "transparent",
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  bottomShade: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.58)",
  },
  captureInstructions: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 126,
    alignItems: "center",
  },
  captureTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  captureSubtitle: {
    color: "#dbe4f0",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
  },
  guidanceDisclaimer: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 8,
  },
  captureControls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: "center",
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#ffffff",
  },
  captureError: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 218,
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
    backgroundColor: "rgba(3, 7, 18, 0.28)",
  },
  previewContent: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 34,
    borderRadius: 18,
    padding: 18,
    backgroundColor: "rgba(5, 8, 13, 0.9)",
  },
  previewTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  previewInstruction: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
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
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
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
