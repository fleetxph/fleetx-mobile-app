import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  acceptBookingContract,
  getBookingContract,
  getBookingContractPdfUrl,
  getContractTemplate,
} from "../api/clientApi";
import { styles } from "../styles/paymentInstructionsStyle";
import {
  getContractAcceptanceState,
  getContractContentDiagnostics,
  htmlToReadableText,
  renderContractContentWithBooking,
} from "../utils/bookingContractDisplay";
import { formatBookingDateTime } from "../utils/bookingDocuments";
import { openPdf, showPdfError } from "../utils/pdfUtils";

function getBookingId(booking, routeParams = {}) {
  return booking?._id || booking?.id || booking?.bookingId || routeParams?.bookingId || "";
}

function normalizeText(value) {
  return String(value || "").trim();
}

function getFriendlyContractErrorMessage(error, fallbackMessage) {
  const status = Number(error?.response?.status || 0);
  const responseData = error?.response?.data || {};
  const backendMessage = String(
    responseData?.message ||
      responseData?.error ||
      responseData?.detail ||
      responseData?.data?.message ||
      ""
  ).trim();

  if (status === 404) return "Contract is not available yet.";
  if (status === 401 || status === 403) return "Please sign in again to view the contract.";
  if (status === 400) return backendMessage || fallbackMessage;
  if (!error?.response) return "Unable to connect. Please try again.";
  return backendMessage || fallbackMessage;
}

function shouldShowPendingContractReview(message) {
  return /rental contract is not accepted yet|contract.*not accepted|not accepted yet|review and accept|accept the rental contract/i.test(
    String(message || "")
  );
}

function getContractTemplateNotice() {
  return "Generated from the current rental contract template using your booking details.";
}

function logBookingDocsError(type, error) {
  if (!__DEV__) return;

  console.log("[BookingDocs][error]", {
    type,
    reachedResponse: Boolean(error?.response),
    status: error?.response?.status || null,
    message: error?.message || "Unknown error",
    responseData: error?.response?.data || null,
  });
}

export default function ContractReviewScreen({ navigation, route }) {
  const [booking, setBooking] = useState(route?.params?.booking || {});
  const [contractRecord, setContractRecord] = useState(null);
  const [contractTemplate, setContractTemplate] = useState(null);
  const [contractLoading, setContractLoading] = useState(true);
  const [contractAccepting, setContractAccepting] = useState(false);
  const [contractError, setContractError] = useState("");
  const [contractNotice, setContractNotice] = useState("");
  const [contractAgreementChecked, setContractAgreementChecked] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [blockedUntilAccepted, setBlockedUntilAccepted] = useState(false);

  const bookingId = getBookingId(booking, route?.params || {});
  const bookingIdSource = booking?._id
    ? "booking._id"
    : booking?.id
    ? "booking.id"
    : booking?.bookingId
    ? "booking.bookingId"
    : route?.params?.bookingId
    ? "route.params.bookingId"
    : "";
  const bookingReference =
    booking?.bookingReference || booking?.reference || booking?.bookingCode || route?.params?.bookingReference || "Not specified";

  useEffect(() => {
    if (route?.params?.booking) {
      setBooking(route.params.booking);
    }
  }, [route?.params?.booking]);

  useEffect(() => {
    const customerName =
      booking?.user?.fullName ||
      booking?.user?.name ||
      booking?.customer?.fullName ||
      booking?.customer?.name ||
      booking?.clientName ||
      booking?.customerName ||
      booking?.fullName ||
      "";
    setSignatureName((prev) => prev || customerName);
  }, [
    booking?.clientName,
    booking?.customer?.fullName,
    booking?.customer?.name,
    booking?.customerName,
    booking?.fullName,
    booking?.user?.fullName,
    booking?.user?.name,
  ]);

  const contractAcceptanceState = useMemo(
    () => getContractAcceptanceState(booking, contractRecord),
    [booking, contractRecord]
  );
  const contractAccepted = contractAcceptanceState.contractAccepted;
  const acceptedContractAt = contractAcceptanceState.acceptedAt;
  const contractDisplay = useMemo(
    () =>
      renderContractContentWithBooking(
        contractRecord || contractTemplate || booking?.contract || booking?.contractData || {},
        booking
      ),
    [booking, contractRecord, contractTemplate]
  );
  const contractReadableText = useMemo(
    () => htmlToReadableText(contractDisplay.textContent || contractDisplay.htmlContent || contractDisplay.content),
    [contractDisplay.content, contractDisplay.htmlContent, contractDisplay.textContent]
  );
  const hasContractReviewContent = Boolean(contractReadableText);
  const contractPdfSource = contractAccepted && bookingId ? getBookingContractPdfUrl(bookingId) : "";
  const canSubmitContractAcceptance = Boolean(
    !contractAccepted && hasContractReviewContent && contractAgreementChecked && signatureName.trim()
  );

  useEffect(() => {
    if (!__DEV__) return;

    console.log("[ContractReview][source]", {
      bookingSpecificLoaded: contractDisplay.bookingSpecificLoaded,
      blockedUntilAccepted,
      usedTemplateFallback: contractDisplay.usedTemplateFallback,
      placeholderCountBefore: contractDisplay.placeholderCountBefore || 0,
      placeholderCountAfter: contractDisplay.placeholderCountAfter || 0,
    });

    console.log("[ContractRender][fields]", {
      hasCustomerName: Boolean(contractDisplay.renderFields?.customerName),
      hasBookingReference: Boolean(contractDisplay.renderFields?.bookingReference && contractDisplay.renderFields?.bookingReference !== "Not specified"),
      hasVehicleName: Boolean(contractDisplay.renderFields?.vehicleName && contractDisplay.renderFields?.vehicleName !== "Not specified"),
      hasTripDates: Boolean(
        contractDisplay.renderFields?.startDate !== "Not specified" && contractDisplay.renderFields?.endDate !== "Not specified"
      ),
      hasPaymentDetails: Boolean(
        contractDisplay.renderFields?.paymentMethod !== "Not specified" ||
          contractDisplay.renderFields?.amountDue !== "Not specified" ||
          contractDisplay.renderFields?.totalAmount !== "Not specified"
      ),
    });
  }, [blockedUntilAccepted, contractDisplay]);

  const loadContractTemplateFallback = async ({ fallbackReason = "" } = {}) => {
    try {
      if (__DEV__) {
        console.log("[ContractAPI][fallback:start]", {
          endpoint: "/api/settings/contract-template",
          reason: fallbackReason || "booking-contract-unavailable",
        });
      }

      const templateResponse = await getContractTemplate({ rawResponse: true });
      const templatePayload = templateResponse?.data || {};
      const diagnostics = getContractContentDiagnostics(templatePayload);
      const renderedTemplate = renderContractContentWithBooking(templatePayload, booking);

      if (__DEV__) {
        console.log("[ContractAPI][fallback:response]", {
          status: templateResponse?.status || null,
          dataKeys: diagnostics.dataKeys,
          hasContractTemplate: diagnostics.hasContractTemplate,
          extractedContentLength: renderedTemplate.content.length,
        });
      }

      if (!renderedTemplate.content) {
        return null;
      }

      setContractRecord(null);
      setContractTemplate(templatePayload);
      setContractNotice(fallbackReason || getContractTemplateNotice());
      setContractError("");
      return templatePayload;
    } catch (error) {
      return null;
    }
  };

  const fetchContractRecord = async () => {
    if (!bookingId) {
      setContractError("Contract is not available yet.");
      setContractLoading(false);
      return;
    }

    try {
      setContractLoading(true);
      setContractError("");
      setContractNotice("");
      setBlockedUntilAccepted(false);

      const response = await getBookingContract(bookingId, { rawResponse: true });
      const responseData = response?.data || {};
      const rendered = renderContractContentWithBooking(responseData, booking);

      if (rendered.content) {
        setContractRecord(responseData);
        setContractTemplate(null);
        setContractError("");
        return;
      }

      const template = await loadContractTemplateFallback({
        fallbackReason: getContractTemplateNotice(),
      });
      if (!template) {
        setContractError("Contract details could not be loaded in-app. Please try again.");
      }
    } catch (error) {
      logBookingDocsError("contract", error);
      const message = getFriendlyContractErrorMessage(error, "Unable to load contract. Please try again.");
      const blocked = shouldShowPendingContractReview(message);
      setBlockedUntilAccepted(blocked);

      const template = await loadContractTemplateFallback({
        fallbackReason: getContractTemplateNotice(),
      });

      if (!template) {
        setContractError(blocked ? "Contract details could not be loaded in-app. Please try again." : message);
      }
    } finally {
      setContractLoading(false);
    }
  };

  useEffect(() => {
    fetchContractRecord();
  }, [bookingId]);

  const handleOpenContractPdf = async () => {
    if (!contractAccepted || !contractPdfSource) return;

    try {
      await openPdf({
        source: contractPdfSource,
        fileName: `FleetX-Contract-${bookingReference || bookingId || "booking"}.pdf`,
        title: "Rental Contract",
        bookingReference,
        type: "contract",
      });
    } catch (error) {
      showPdfError(
        error,
        "Contract PDF is not available yet. You can review the accepted contract in-app."
      );
    }
  };

  const handleAcceptContract = async () => {
    if (!bookingId || !canSubmitContractAcceptance) return;

    try {
      if (__DEV__) {
        console.log("[ContractReview][accept:start]", {
          bookingIdSource: bookingIdSource || "none",
          hasSignatureName: Boolean(signatureName.trim()),
        });
      }

      setContractAccepting(true);
      setContractError("");
      const payload = {
        accepted: true,
        signatureName: signatureName.trim(),
        acceptedAt: new Date().toISOString(),
      };
      const response = await acceptBookingContract(bookingId, payload);
      const updatedBooking =
        response?.booking || response?.updatedBooking || response?.data?.booking || null;
      const acceptedAt =
        response?.contract?.acceptedAt ||
        response?.acceptedAt ||
        response?.data?.acceptedAt ||
        payload.acceptedAt;
      const nextBooking = updatedBooking
        ? { ...booking, ...updatedBooking, contractAccepted: true }
        : {
            ...booking,
            contractAccepted: true,
            contractAcceptedAt: acceptedAt,
            contractStatus: "accepted",
            requiresContract: true,
            contract: {
              ...(booking?.contract || {}),
              accepted: true,
              acceptedAt,
              status: "accepted",
            },
          };

      setBooking(nextBooking);
      setContractRecord((prev) => ({
        ...(prev || {}),
        ...response,
        contract: {
          ...(prev?.contract || {}),
          ...(response?.contract || {}),
          accepted: true,
          acceptedAt,
          status: "accepted",
          signatureName: signatureName.trim(),
        },
      }));

      DeviceEventEmitter.emit("contractAccepted", {
        bookingId,
        acceptedAt,
        updatedBooking: nextBooking,
      });

      if (__DEV__) {
        console.log("[ContractReview][accept:success]", {
          contractAccepted: true,
        });
      }

      Alert.alert("Contract accepted", "You can now upload your payment proof.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      logBookingDocsError("contractAccept", error);
      setContractError(getFriendlyContractErrorMessage(error, "Unable to accept contract. Please try again."));
    } finally {
      setContractAccepting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0B132B" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>FleetX Vehicle Rental Agreement</Text>
          <Text style={styles.subtitle}>{bookingReference}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View
            style={[
              styles.contractStatusPill,
              contractAccepted ? styles.contractStatusPillAccepted : styles.contractStatusPillPending,
            ]}
          >
            <Text
              style={[
                styles.contractStatusText,
                contractAccepted ? styles.contractStatusTextAccepted : styles.contractStatusTextPending,
              ]}
            >
              {contractAccepted ? "Accepted" : "Pending Acceptance"}
            </Text>
          </View>
          {acceptedContractAt ? (
            <Text style={styles.contractHelperText}>
              Accepted on {formatBookingDateTime(acceptedContractAt)}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          {contractLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#F47C20" />
              <Text style={styles.loadingText}>Loading contract...</Text>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.contractScroll}
                contentContainerStyle={styles.contractScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {contractReadableText ? (
                  <Text style={styles.contractText}>{contractReadableText}</Text>
                ) : (
                  <Text style={styles.placeholderText}>
                    {contractError || "Contract details could not be loaded in-app. Please try again."}
                  </Text>
                )}
              </ScrollView>

              {contractNotice ? <Text style={styles.contractHelperText}>{contractNotice}</Text> : null}
              {!contractAccepted && hasContractReviewContent ? (
                <Text style={styles.contractHelperText}>
                  Please review the rental agreement before accepting.
                </Text>
              ) : null}
              {contractError && hasContractReviewContent ? (
                <Text style={styles.inlineErrorText}>{contractError}</Text>
              ) : null}
              {!hasContractReviewContent ? (
                <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={fetchContractRecord}>
                  <Text style={styles.secondaryButtonText}>Retry Load Contract</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>

        {!contractAccepted ? (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.85}
              onPress={() => setContractAgreementChecked((prev) => !prev)}
            >
              <View style={[styles.checkbox, contractAgreementChecked && styles.checkboxChecked]}>
                {contractAgreementChecked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.checkboxText}>
                I have reviewed the rental contract and agree to its terms.
              </Text>
            </TouchableOpacity>

            <TextInput
              value={signatureName}
              onChangeText={setSignatureName}
              placeholder="Type your full name"
              placeholderTextColor="#98A2B3"
              style={styles.signatureInput}
            />
            <Text style={styles.contractHelperText}>
              Typing your name serves as your electronic confirmation for this booking.
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, (!canSubmitContractAcceptance || contractAccepting) && styles.buttonDisabled]}
              activeOpacity={0.9}
              disabled={!canSubmitContractAcceptance || contractAccepting}
              onPress={handleAcceptContract}
            >
              <Text style={styles.primaryButtonText}>
                {contractAccepting ? "Accepting..." : "Accept Contract"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.contractAcceptedCard}>
              <Text style={styles.contractAcceptedText}>Rental contract accepted.</Text>
              <Text style={styles.contractAcceptedSubtext}>
                You can return to payment instructions and upload your payment proof.
              </Text>
            </View>
            {contractPdfSource ? (
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={handleOpenContractPdf}>
                <Text style={styles.secondaryButtonText}>View Contract PDF</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
