import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isUnauthorizedError } from "../api/api";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/clientApi";
import { styles } from "../styles/notificationsStyle";
import {
  getStoredNotificationInbox,
  markAllLocalNotificationsRead,
  markLocalNotificationRead,
} from "../services/notificationService";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortNotifications(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left?.createdAt || left?.readAt || 0).getTime() || 0;
    const rightTime = new Date(right?.createdAt || right?.readAt || 0).getTime() || 0;
    return rightTime - leftTime;
  });
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(
    async (mode = "load") => {
      try {
        mode === "refresh" ? setRefreshing(true) : setLoading(true);
        const [backendResult, localItems] = await Promise.allSettled([
          getNotifications(50),
          getStoredNotificationInbox(),
        ]);
        const backendData =
          backendResult.status === "fulfilled"
            ? backendResult.value
            : { unreadCount: 0, notifications: [] };
        const backendNotifications = Array.isArray(backendData?.notifications)
          ? backendData.notifications
          : [];
        const localNotifications =
          localItems.status === "fulfilled" && Array.isArray(localItems.value)
            ? localItems.value
            : [];
        const localUnreadCount = localNotifications.filter(
          (item) => !item?.isRead && !item?.read && !item?.readAt
        ).length;

        setNotifications(sortNotifications([...localNotifications, ...backendNotifications]));
        setUnreadCount(Number(backendData?.unreadCount || 0) + localUnreadCount);
      } catch (err) {
        if (isUnauthorizedError(err)) {
          navigation.replace("ClientLogin");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigation]
  );

  useEffect(() => {
    loadNotifications();
    const unsubscribe = navigation.addListener("focus", () => loadNotifications("refresh"));
    return unsubscribe;
  }, [loadNotifications, navigation]);

  const handlePress = async (item) => {
    try {
      if (item?.source === "local") {
        await markLocalNotificationRead(item?._id);
      } else if (!item?.isRead) {
        await markNotificationRead(item._id);
      }
      await loadNotifications("refresh");
    } catch {
      // Keep navigation responsive even if marking read fails.
    }

    navigation.navigate("MainApp", {
      screen: "Bookings",
      params: item?.bookingId ? { bookingId: item.bookingId } : undefined,
    });
  };

  const handleMarkAll = async () => {
    await Promise.allSettled([markAllNotificationsRead(), markAllLocalNotificationsRead()]);
    await loadNotifications("refresh");
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, !item?.isRead && styles.itemUnread]}
      activeOpacity={0.88}
      onPress={() => handlePress(item)}
    >
      <View style={styles.itemIcon}>
        <Ionicons name={item?.isRead ? "notifications-outline" : "notifications"} size={18} color="#f97316" />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text style={styles.itemTitle}>{item?.title || "FleetX Booking Update"}</Text>
          {!item?.isRead ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.itemMessage}>{item?.message || ""}</Text>
        <Text style={styles.itemDate}>{formatDate(item?.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>{unreadCount} unread FleetX update(s)</Text>
          </View>
          <TouchableOpacity style={styles.markButton} onPress={handleMarkAll}>
            <Text style={styles.markButtonText}>Mark read</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item, index) => item?._id || String(index)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications("refresh")} />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptyText}>FleetX booking and payment updates will appear here.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
