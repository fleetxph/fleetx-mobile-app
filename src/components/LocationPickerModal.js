import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/locationPickerModalStyle";

const DEFAULT_COORDINATES = {
  destination: { latitude: 14.5995, longitude: 120.9842 },
  pickup: { latitude: 14.5547, longitude: 121.0244 },
};

export default function LocationPickerModal({
  visible,
  mode = "destination",
  initialLocation,
  initialLabel,
  onClose,
  onConfirm,
}) {
  const title = mode === "pickup" ? "Pin Pickup Location" : "Pin Destination";
  const placeholderLabel =
    mode === "pickup" ? "Pinned pickup location" : "Pinned destination";
  const fallbackCoordinates = DEFAULT_COORDINATES[mode] || DEFAULT_COORDINATES.destination;
  const selectedCoordinates = initialLocation || fallbackCoordinates;
  const selectedLabel = initialLabel || "";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              Drag or tap the map to set the approximate location.
            </Text>

            <View style={styles.mapPreviewCard}>
              <View style={styles.mapGrid}>
                <View style={styles.mapLineHorizontal} />
                <View style={styles.mapLineHorizontalAlt} />
                <View style={styles.mapLineVertical} />
                <View style={styles.mapLineVerticalAlt} />
                <View style={styles.pinShadow} />
                <Ionicons name="location" size={34} color="#F47C20" style={styles.centerPin} />
              </View>
              <Text style={styles.mapNote}>
                Map pin preview only - backend integration coming soon.
              </Text>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Selected coordinates</Text>
              <Text style={styles.previewValue}>
                {selectedCoordinates.latitude?.toFixed?.(4) || "14.5995"},{" "}
                {selectedCoordinates.longitude?.toFixed?.(4) || "120.9842"}
              </Text>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Location label</Text>
              <TextInput
                value={selectedLabel}
                editable={false}
                placeholder={placeholderLabel}
                placeholderTextColor="#98A2B3"
                style={styles.labelInput}
              />
            </View>

            <View style={styles.helperCard}>
              <Ionicons name="information-circle-outline" size={18} color="#F47C20" />
              <Text style={styles.helperText}>
                You can still edit the text manually after selecting a pin. Manual text remains the source of truth.
              </Text>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.9}
                onPress={() =>
                  onConfirm?.({
                    label: selectedLabel || placeholderLabel,
                    latitude: selectedCoordinates.latitude,
                    longitude: selectedCoordinates.longitude,
                    source: "placeholder",
                  })
                }
              >
                <Text style={styles.primaryButtonText}>Use This Location</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
