import { Platform, StyleSheet } from "react-native";

const shadow = Platform.select({
  ios: {
    shadowColor: "#0B132B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  android: {
    elevation: 4,
  },
  default: {
    shadowColor: "#0B132B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
});

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: {
    color: "#0B132B",
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: "#0B132B",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    ...shadow,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "#FFF4E8",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  statusPillAvailable: {
    backgroundColor: "#DCFCE7",
  },
  statusPillUnavailable: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  statusTextAvailable: {
    color: "#166534",
  },
  statusTextUnavailable: {
    color: "#991B1B",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
  },
  heroMeta: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 14,
    ...shadow,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    flex: 0.45,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
  },
  value: {
    flex: 0.55,
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },
  documentBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    padding: 14,
    marginBottom: 14,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  fileTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  fileText: {
    color: "#9A3412",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 3,
  },
  unavailableText: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 10,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#0B132B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#FFF4E8",
    borderWidth: 1,
    borderColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: "#E5E7EB",
    borderColor: "#E5E7EB",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButtonText: {
    color: "#C2410C",
    fontSize: 14,
    fontWeight: "900",
  },
  disabledButtonText: {
    color: "#94A3B8",
  },
});
