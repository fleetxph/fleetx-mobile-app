import { View, Text, ActivityIndicator } from "react-native";

export default function LoadingOverlay({
  visible = false,
  text = "Please wait...",
}) {
  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(11, 22, 51, 0.22)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
    >
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 24,
          paddingVertical: 20,
          borderRadius: 20,
          alignItems: "center",
          minWidth: 180,
        }}
      >
        <ActivityIndicator size="large" color="#08142E" />
        <Text
          style={{
            marginTop: 12,
            fontSize: 15,
            fontWeight: "600",
            color: "#0B1633",
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}