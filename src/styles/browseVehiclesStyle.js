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

  searchInputWrapper: {
    minHeight: 54,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 14,
  },

  filterSortRow: {
    marginBottom: 12,
    gap: 12,
  },

  filterButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonText: {
    color: colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },

  sortGroup: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 12,
  },

  sortButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  sortButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  sortButtonText: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: "700",
  },

  sortButtonTextSelected: {
    color: colors.white,
  },

  activeFilterArea: {
    gap: 10,
  },

  activeFilterChips: {
    gap: 10,
    paddingRight: 8,
  },

  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  activeFilterChipText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  clearAllInlineButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },

  clearAllInlineButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
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

  emptyStateCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginTop: 10,
    alignItems: "center",
    width: "100%",
  },

  emptyStateButton: {
    marginTop: 16,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyStateButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
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

  filterModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },

  filterSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 12,
    maxHeight: "86%",
  },

  filterSheetHandle: {
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D0D5DD",
    alignSelf: "center",
    marginBottom: 16,
  },

  filterSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginBottom: 14,
  },

  filterSheetTitle: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: "900",
  },

  filterSheetClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  filterSheetContent: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },

  filterSection: {
    marginBottom: 18,
  },

  filterSectionTitle: {
    color: colors.heading,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },

  filterOptionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  filterChip: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  filterChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  filterChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },

  filterChipTextSelected: {
    color: colors.white,
  },

  filterFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.softBorder,
    backgroundColor: colors.card,
  },

  clearFilterButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  clearFilterButtonText: {
    color: colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },

  applyFilterButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  applyFilterButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
});
