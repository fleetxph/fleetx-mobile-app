import { Platform, StatusBar, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 12,
  },

  listHeader: {
    paddingTop: 8,
    marginBottom: 6,
  },

  header: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.heading || "#0F172A",
    marginBottom: 18,
  },

  filterCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  searchInput: {
    height: 52,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },

  chipTextActive: {
    color: colors.white,
  },

  resultText: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: 18,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },

  columnWrapper: {
    justifyContent: "space-between",
  },

  card: {
    width: "48.2%",
    backgroundColor: colors.card,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  image: {
    width: "100%",
    height: 130,
    backgroundColor: "#E5E7EB",
  },

  imageFallback: {
    width: "100%",
    height: 130,
    backgroundColor: colors.primary || "#0B132B",
    alignItems: "center",
    justifyContent: "center",
  },

  imageFallbackText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },

  cardBody: {
    padding: 14,
    minHeight: 126,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft || "#FFF2E8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },

  badgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  title: {
    color: colors.heading || colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 6,
  },

  meta: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },

  price: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "800",
  },

  tripSummaryCard: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },

  tripSummaryTitle: {
    color: "#9A3412",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  tripSummaryText: {
    color: "#C2410C",
    fontSize: 13,
    lineHeight: 18,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginTop: 10,
    alignItems: "center",
    width: "100%",
  },

  loadMoreButton: {
    marginTop: 10,
    marginBottom: 18,
    borderRadius: 16,
    backgroundColor: colors.accent,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  loadMoreButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },

  endText: {
    color: colors.subtext,
    fontSize: 13,
    textAlign: "center",
    paddingTop: 14,
    paddingBottom: 22,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.heading || colors.text,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 18,
  },
});
