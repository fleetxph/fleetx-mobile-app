import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/notificationStyles";

export default function NotificationIcon({
  unreadCount = 0,
  onPress,
  accessibilityLabel = "Open notifications",
}) {
  const safeUnreadCount = Number.isFinite(Number(unreadCount))
    ? Math.max(0, Number(unreadCount))
    : 0;
  const showBadge = safeUnreadCount > 0;

  return (
    <TouchableOpacity
      style={styles.button}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="notifications-outline" size={20} color="#0B132B" />
      {showBadge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {safeUnreadCount > 99 ? "99+" : safeUnreadCount}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
