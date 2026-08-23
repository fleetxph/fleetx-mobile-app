import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../styles/verificationStyle";

export default function VerificationCaptureRow({
  title,
  hint,
  imageUri,
  isSelfie = false,
  statusLabel,
  statusStyles,
  hasLocalAsset,
  isBusy,
  canChange,
  canRemoveSubmitted,
  helperText,
  remark,
  error,
  onChange,
  onDiscard,
  onRemoveSubmitted,
  onViewExample,
}) {
  const [badgeStyle, badgeToneStyle, badgeTextStyle, badgeTextToneStyle] = statusStyles;

  return (
    <View style={styles.captureRow}>
      <View style={styles.captureRowHeader}>
        <Text style={styles.captureRowTitle}>
          {title} <Text style={styles.requiredMark}>*</Text>
        </Text>
        {!isSelfie ? (
          <TouchableOpacity onPress={onViewExample} hitSlop={8}>
            <Text style={styles.exampleLink}>View Example</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.captureRowContent}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.captureThumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.captureThumbnail, styles.captureThumbnailEmpty]}>
            <MaterialCommunityIcons
              name={isSelfie ? "face-recognition" : "card-account-details-outline"}
              size={30}
              color="#94a3b8"
            />
          </View>
        )}

        <View style={styles.captureRowBody}>
          <View style={[badgeStyle, badgeToneStyle, styles.captureStatusBadge]}>
            <Text style={[badgeTextStyle, badgeTextToneStyle]}>{statusLabel}</Text>
          </View>
          <Text style={styles.captureRowHint}>{hint}</Text>
          {hasLocalAsset ? (
            <View style={styles.inlineDraftNotice}>
              <Ionicons name="cloud-upload-outline" size={14} color="#1d4ed8" />
              <Text style={styles.inlineDraftNoticeText}>Not submitted</Text>
            </View>
          ) : null}
        </View>
      </View>

      {remark ? <Text style={styles.slotRemark}>Admin note: {remark}</Text> : null}

      <View style={styles.captureRowActions}>
        <TouchableOpacity
          style={[styles.compactPrimaryAction, (!canChange || isBusy) && styles.submitButtonDisabled]}
          onPress={onChange}
          disabled={!canChange || isBusy}
        >
          <Text style={styles.compactPrimaryActionText}>
            {imageUri ? "Change" : isSelfie ? "Take Selfie" : "Add Photo"}
          </Text>
        </TouchableOpacity>

        {hasLocalAsset ? (
          <TouchableOpacity
            style={[styles.compactSecondaryAction, isBusy && styles.submitButtonDisabled]}
            onPress={onDiscard}
            disabled={isBusy}
          >
            <Text style={styles.compactSecondaryActionText}>Discard</Text>
          </TouchableOpacity>
        ) : canRemoveSubmitted ? (
          <TouchableOpacity
            style={[styles.compactDangerAction, isBusy && styles.submitButtonDisabled]}
            onPress={onRemoveSubmitted}
            disabled={isBusy}
          >
            <Text style={styles.compactDangerActionText}>Remove Submitted</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {helperText ? <Text style={styles.slotHelperText}>{helperText}</Text> : null}
      {error ? <Text style={styles.slotErrorText}>{error}</Text> : null}
    </View>
  );
}
