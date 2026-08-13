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
    paddingTop: 10,
  },

  listHeader: {
    paddingTop: 8,
    marginBottom: 10,
  },

  heroHeaderCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FFFCF7",
    borderRadius: 22,
    minHeight: 156,
    paddingLeft: 18,
    paddingRight: 10,
    paddingVertical: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.045,
    shadowRadius: 14,
    elevation: 3,
  },

  heroHeaderAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: "#F97316",
  },

  heroHeaderContentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  heroHeaderTextBlock: {
    width: "57%",
    paddingRight: 6,
    zIndex: 1,
  },

  header: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "900",
    color: colors.heading || "#0F172A",
    marginBottom: 8,
  },

  headerSubtext: {
    color: "#475467",
    fontSize: 13,
    lineHeight: 19,
  },

  heroVehicleWrap: {
    position: "absolute",
    right: -7,
    top: 12,
    bottom: 8,
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
  },

  heroVehicleImage: {
    width: "112%",
    height: "112%",
  },

  filterCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F1E4D5",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  searchInputWrapper: {
    minHeight: 56,
    backgroundColor: "#FCFDFE",
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 14,
  },

  filterSortRow: {
    marginBottom: 14,
    gap: 14,
  },

  filterButton: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    paddingRight: 14,
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
    color: "#475467",
    fontWeight: "700",
  },

  resultRow: {
    marginBottom: 18,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },

  card: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F2E8DE",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },

  cardAccentBar: {
    height: 5,
    backgroundColor: "#F97316",
  },

  imageWrap: {
    height: 205,
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "#FCFCFB",
    borderWidth: 1,
    borderColor: "#F6EEE7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft || "#FFF2E8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 11,
  },

  badgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  cardTextBlock: {
    marginBottom: 14,
  },

  title: {
    color: colors.heading || colors.text,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
    marginBottom: 6,
  },

  meta: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 19,
  },

  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E8EDF3",
    paddingVertical: 12,
    rowGap: 13,
    marginBottom: 2,
  },

  specItem: {
    width: "50%",
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },

  specIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#FFF3E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  specTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  specValue: {
    color: "#172033",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },

  specLabel: {
    color: colors.subtext,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
  },

  colorRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderColor: "#E8EDF3",
  },

  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D8DEE8",
    alignItems: "center",
    justifyContent: "center",
  },

  colorValue: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "800",
  },

  colorLabel: {
    color: colors.subtext,
    fontSize: 10,
    marginTop: 2,
  },

  fitNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E8EDF3",
  },

  fitNoteText: {
    flex: 1,
    color: "#667085",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },

  cardFooter: {
    paddingTop: 15,
    alignItems: "center",
  },

  price: {
    color: colors.accent,
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 13,
    textAlign: "center",
  },

  viewDetailsButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  viewDetailsButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
    marginRight: 6,
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

  nextPageLoader: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
  },

  nextPageRetry: {
    minHeight: 58,
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  nextPageRetryText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
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
