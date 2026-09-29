import { forwardRef, useImperativeHandle } from "react";
import { StyleSheet, Text, View } from "react-native";

const LocationPickerMap = forwardRef(function LocationPickerMap({ style }, ref) {
  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: () => {},
    }),
    []
  );

  return (
    <View style={[style, styles.fallback]}>
      <Text style={styles.fallbackTitle}>Interactive map unavailable on web</Text>
      <Text style={styles.fallbackText}>
        Enter or confirm the location label below.
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#EEF2F6",
  },
  fallbackTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  fallbackText: {
    marginTop: 6,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});

export default LocationPickerMap;
