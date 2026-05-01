import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  markButton: {
    borderRadius: 999,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markButtonText: {
    color: "#c2410c",
    fontSize: 12,
    fontWeight: "900",
  },
  listContent: {
    paddingBottom: 24,
  },
  item: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemUnread: {
    borderColor: "#fdba74",
    backgroundColor: "#fff7ed",
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  itemBody: {
    flex: 1,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f97316",
  },
  itemMessage: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  itemDate: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    marginTop: 100,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
  },
});
