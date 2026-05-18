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
  getClientBookingById,
  getClientBookings,
  getContractTemplate,
} from "../api/clientApi";
import { styles } from "../styles/paymentInstructionsStyle";
import {
  buildContractRenderFields,
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

function getBookingReference(booking, routeParams = {}) {
  return (
    booking?.bookingReference ||
    booking?.reference ||
    booking?.bookingCode ||
    booking?.referenceNo ||
    routeParams?.bookingReference ||
    "Not specified"
  );
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeIdentifier(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeNameForMatch(value) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function isLikelyMongoId(value) {
  return /^[a-f0-9]{24}$/i.test(normalizeText(value));
}

function getExpectedSignerName(booking = {}) {
  return (
    booking?.user?.fullName ||
    booking?.user?.name ||
    booking?.customer?.fullName ||
    booking?.customer?.name ||
    booking?.clientName ||
    booking?.customerName ||
    booking?.fullName ||
    ""
  );
}

function getFriendlyContractErrorMessage(error, fallbackMessage) {
  const status = Number(error?.response?.status || error?.status || 0);
  const responseData = error?.response?.data || error?.data || {};
  const backendMessage = String(
    responseData?.message ||
      responseData?.error ||
      responseData?.detail ||
      responseData?.data?.message ||
      error?.message ||
      ""
  ).trim();

  if (status === 404) return backendMessage || "Contract is not available yet.";
  if (status === 401 || status === 403) return "Please sign in again to view the contract.";
  if (status === 400) return backendMessage || fallbackMessage;
  if (!error?.response && !error?.status) return backendMessage || "Unable to connect. Please try again.";
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
    status: error?.response?.status || error?.status || null,
    message: error?.message || "Unknown error",
    responseData: error?.response?.data || error?.data || null,
  });
}

function mergeBookingData(baseBooking = {}, incomingBooking = {}) {
  return {
    ...baseBooking,
    ...incomingBooking,
    user: {
      ...(baseBooking?.user || {}),
      ...(incomingBooking?.user || {}),
    },
    customer: {
      ...(baseBooking?.customer || {}),
      ...(incomingBooking?.customer || {}),
    },
    vehicle: {
      ...(baseBooking?.vehicle || {}),
      ...(incomingBooking?.vehicle || {}),
    },
    vehicleSnapshot: {
      ...(baseBooking?.vehicleSnapshot || {}),
      ...(incomingBooking?.vehicleSnapshot || {}),
    },
    selectedVehicle: {
      ...(baseBooking?.selectedVehicle || {}),
      ...(incomingBooking?.selectedVehicle || {}),
    },
    car: {
      ...(baseBooking?.car || {}),
      ...(incomingBooking?.car || {}),
    },
    invoice: {
      ...(baseBooking?.invoice || {}),
      ...(incomingBooking?.invoice || {}),
    },
    contract: {
      ...(baseBooking?.contract || {}),
      ...(incomingBooking?.contract || {}),
    },
    contractData: {
      ...(baseBooking?.contractData || {}),
      ...(incomingBooking?.contractData || {}),
    },
  };
}

function extractBookingFromResponse(payload) {
  const candidate = payload?.booking || payload?.data?.booking || payload?.data || payload;
  return candidate && typeof candidate === "object" ? candidate : null;
}

function buildBookingLookupKeys(booking = {}, routeParams = {}) {
  return [
    booking?._id,
    booking?.id,
    booking?.bookingId,
    booking?.bookingReference,
    booking?.bookingCode,
    booking?.reference,
    booking?.referenceNo,
    routeParams?.bookingId,
    routeParams?.bookingReference,
  ]
    .map(normalizeIdentifier)
    .filter(Boolean);
}

function findMatchingBooking(bookings = [], booking = {}, routeParams = {}) {
  const lookup = new Set(buildBookingLookupKeys(booking, routeParams));
  if (!lookup.size) return null;

  return (
    bookings.find((item) => {
      const itemKeys = [
        item?._id,
        item?.id,
        item?.bookingId,
        item?.bookingReference,
        item?.bookingCode,
        item?.reference,
        item?.referenceNo,
      ]
        .map(normalizeIdentifier)
        .filter(Boolean);

      return itemKeys.some((key) => lookup.has(key));
    }) || null
  );
}

function needsFullBookingDetails(booking = {}) {
  const fields = buildContractRenderFields(booking);
  const hasVehicleName = fields.vehicleName && fields.vehicleName !== "Not specified";
  const hasPlateNumber = fields.plateNumber && fields.plateNumber !== "Not specified";
  const hasTripType = fields.rentalType && fields.rentalType !== "Not specified";
  const hasInvoiceData = Boolean(
    booking?.invoice ||
      booking?.invoiceData ||
      booking?.invoiceReference ||
      booking?.invoiceNumber ||
      booking?.amountDue ||
      booking?.amountToPay
  );

  return !(hasVehicleName && hasPlateNumber && hasTripType && hasInvoiceData);
}

function buildDisabledReason({
  hasRenderedContent,
  contractAgreementChecked,
  signatureName,
  exactNameMatch,
  bookingIdPresent,
}) {
  if (!hasRenderedContent) return "Contract details are still loading.";
  if (!contractAgreementChecked) return "Please review and agree to the FleetX Rental Agreement.";
  if (!normalizeText(signatureName) || !exactNameMatch) {
    return "Please type your full name exactly as shown.";
  }
  if (!bookingIdPresent) {
    return "Booking information is missing. Please go back and reopen payment instructions.";
  }

  return "";
}

export default function ContractReviewScreen({ navigation, route }) {
  const routeBooking = route?.params?.booking || {};
  const [booking, setBooking] = useState(routeBooking);
  const [contractRecord, setContractRecord] = useState(null);
  const [contractTemplate, setContractTemplate] = useState(null);
  const [contractLoading, setContractLoading] = useState(true);
  const [contractAccepting, setContractAccepting] = useState(false);
  const [contractError, setContractError] = useState("");
  const [contractSubmitError, setContractSubmitError] = useState("");
  const [contractNotice, setContractNotice] = useState("");
  const [reviewedFullAgreement, setReviewedFullAgreement] = useState(false);
  const [agreedToRentalAgreement, setAgreedToRentalAgreement] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [blockedUntilAccepted, setBlockedUntilAccepted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingWarning, setBookingWarning] = useState("");

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
  const bookingReference = getBookingReference(booking, route?.params || {});
  const expectedName = useMemo(() => getExpectedSignerName(booking), [booking]);
  const normalizedExpectedName = useMemo(() => normalizeNameForMatch(expectedName), [expectedName]);
  const normalizedTypedName = useMemo(() => normalizeNameForMatch(signatureName), [signatureName]);
  const exactNameMatch = Boolean(
    normalizedExpectedName && normalizedTypedName && normalizedExpectedName === normalizedTypedName
  );

  useEffect(() => {
    setBooking(routeBooking);
  }, [routeBooking]);

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
  const hasRenderedContent = Boolean(!bookingLoading && !contractLoading && hasContractReviewContent);
  const hasSignatureName = Boolean(normalizedTypedName);
  const bookingIdPresent = isLikelyMongoId(bookingId);
  const hasCheckedAgreement = reviewedFullAgreement && agreedToRentalAgreement;
  const canSubmitContractAcceptance = Boolean(
    !contractAccepted &&
      hasRenderedContent &&
      hasCheckedAgreement &&
      hasSignatureName &&
      exactNameMatch &&
      bookingIdPresent
  );
  const disabledReason = buildDisabledReason({
    hasRenderedContent,
    contractAgreementChecked: hasCheckedAgreement,
    signatureName,
    exactNameMatch,
    bookingIdPresent,
  });
  const contractPdfSource = contractAccepted && bookingIdPresent ? getBookingContractPdfUrl(bookingId) : "";

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
      hasBookingReference: Boolean(
        contractDisplay.renderFields?.bookingReference &&
          contractDisplay.renderFields?.bookingReference !== "Not specified"
      ),
      hasVehicleName: Boolean(
        contractDisplay.renderFields?.vehicleName &&
          contractDisplay.renderFields?.vehicleName !== "Not specified"
      ),
      hasTripDates: Boolean(
        contractDisplay.renderFields?.startDate !== "Not specified" &&
          contractDisplay.renderFields?.endDate !== "Not specified"
      ),
      hasPaymentDetails: Boolean(
        contractDisplay.renderFields?.paymentMethod !== "Not specified" ||
          contractDisplay.renderFields?.amountDue !== "Not specified" ||
          contractDisplay.renderFields?.totalAmount !== "Not specified"
      ),
    });
  }, [blockedUntilAccepted, contractDisplay]);

  useEffect(() => {
    if (!__DEV__) return;

    console.log("[ContractReview][canAccept]", {
      hasRenderedContent,
      reviewedFullAgreement,
      agreedToRentalAgreement,
      hasSignatureName,
      expectedName: normalizedExpectedName,
      typedName: normalizedTypedName,
      exactNameMatch,
      bookingIdPresent,
      canAccept: canSubmitContractAcceptance,
    });
  }, [
    bookingIdPresent,
    canSubmitContractAcceptance,
    exactNameMatch,
    hasRenderedContent,
    hasSignatureName,
    normalizedExpectedName,
    normalizedTypedName,
    reviewedFullAgreement,
    agreedToRentalAgreement,
  ]);

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
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const hydrateBookingDetails = async () => {
      const initialBooking = route?.params?.booking || {};
      let nextBooking = initialBooking;
      let fetchedDetails = false;
      let refreshWarning = "";
      let resolvedBookingId = getBookingId(initialBooking, route?.params || {});

      try {
        setBookingLoading(true);
        setBookingWarning("");

        if (!isLikelyMongoId(resolvedBookingId) || needsFullBookingDetails(nextBooking)) {
          let matchedBooking = null;

          if (isLikelyMongoId(resolvedBookingId)) {
            try {
              const response = await getClientBookingById(resolvedBookingId, { rawResponse: true });
              const fetchedBooking = extractBookingFromResponse(response?.data);
              if (fetchedBooking) {
                nextBooking = mergeBookingData(nextBooking, fetchedBooking);
                resolvedBookingId = getBookingId(nextBooking, route?.params || {});
                fetchedDetails = true;
              }
            } catch (error) {
              logBookingDocsError("bookingById", error);
            }
          }

          if (!isLikelyMongoId(resolvedBookingId) || needsFullBookingDetails(nextBooking)) {
            const listResponse = await getClientBookings();
            const bookings = Array.isArray(listResponse?.bookings)
              ? listResponse.bookings
              : Array.isArray(listResponse?.data)
              ? listResponse.data
              : Array.isArray(listResponse)
              ? listResponse
              : [];

            matchedBooking = findMatchingBooking(bookings, nextBooking, route?.params || {});
            if (matchedBooking) {
              nextBooking = mergeBookingData(nextBooking, matchedBooking);
              resolvedBookingId = getBookingId(nextBooking, route?.params || {});
              fetchedDetails = true;
            }

            if (matchedBooking && isLikelyMongoId(resolvedBookingId) && needsFullBookingDetails(nextBooking)) {
              try {
                const detailResponse = await getClientBookingById(resolvedBookingId, { rawResponse: true });
                const fetchedBooking = extractBookingFromResponse(detailResponse?.data);
                if (fetchedBooking) {
                  nextBooking = mergeBookingData(nextBooking, fetchedBooking);
                  fetchedDetails = true;
                }
              } catch (error) {
                logBookingDocsError("bookingById", error);
                refreshWarning = "Some booking details could not be refreshed. Please review carefully.";
              }
            }
          }
        }
      } catch (error) {
        logBookingDocsError("bookingDetails", error);
        refreshWarning = "Some booking details could not be refreshed. Please review carefully.";
      } finally {
        if (!isMounted) return;

        setBooking(nextBooking);
        setBookingWarning(refreshWarning);
        setBookingLoading(false);

        if (__DEV__) {
          const renderFields = buildContractRenderFields(nextBooking);
          console.log("[ContractReview][bookingData]", {
            hasRouteBooking: Boolean(route?.params?.booking),
            fetchedDetails,
            bookingIdSource: bookingIdSource || "none",
            hasVehicleObject: Boolean(
              nextBooking?.vehicle ||
                nextBooking?.vehicleDetails ||
                nextBooking?.vehicleSnapshot ||
                nextBooking?.selectedVehicle ||
                nextBooking?.car
            ),
            hasVehicleName: Boolean(renderFields.vehicleName && renderFields.vehicleName !== "Not specified"),
            hasPlateNumber: Boolean(renderFields.plateNumber && renderFields.plateNumber !== "Not specified"),
            hasTripType: Boolean(renderFields.rentalType && renderFields.rentalType !== "Not specified"),
            hasInvoiceData: Boolean(
              nextBooking?.invoice ||
                nextBooking?.invoiceData ||
                nextBooking?.invoiceReference ||
                nextBooking?.invoiceNumber
            ),
            topLevelKeys: Object.keys(nextBooking || {}),
            vehicleKeys: Object.keys(
              nextBooking?.vehicle ||
                nextBooking?.vehicleDetails ||
                nextBooking?.vehicleSnapshot ||
                nextBooking?.selectedVehicle ||
                {}
            ),
          });
        }
      }
    };

    hydrateBookingDetails();

    return () => {
      isMounted = false;
    };
  }, [route?.params?.booking, route?.params?.bookingId, route?.params?.bookingReference]);

  useEffect(() => {
    let isMounted = true;

    const fetchContractRecord = async () => {
      if (bookingLoading) return;

      if (!bookingIdPresent) {
        setContractError("Booking information is missing. Please go back and reopen payment instructions.");
        setContractLoading(false);
        return;
      }

      try {
        setContractLoading(true);
        setContractError("");
        setContractNotice("");
        setBlockedUntilAccepted(false);

        const response = await getBookingContract(bookingId, { rawResponse: true });
        if (!isMounted) return;

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
        if (!template && isMounted) {
          setContractError("Contract details could not be loaded in-app. Please try again.");
        }
      } catch (error) {
        if (!isMounted) return;

        logBookingDocsError("contract", error);
        const message = getFriendlyContractErrorMessage(error, "Unable to load contract. Please try again.");
        const blocked = shouldShowPendingContractReview(message);
        setBlockedUntilAccepted(blocked);

        const template = await loadContractTemplateFallback({
          fallbackReason: getContractTemplateNotice(),
        });

        if (!template && isMounted) {
          setContractError(blocked ? "Contract details could not be loaded in-app. Please try again." : message);
        }
      } finally {
        if (isMounted) {
          setContractLoading(false);
        }
      }
    };

    fetchContractRecord();

    return () => {
      isMounted = false;
    };
  }, [booking, bookingId, bookingIdPresent, bookingLoading]);

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
    if (__DEV__) {
      console.log("[ContractReview][button]", {
        pressed: true,
        disabled: !canSubmitContractAcceptance || contractAccepting,
        loading: contractAccepting,
        canAccept: canSubmitContractAcceptance,
      });
    }

    if (!canSubmitContractAcceptance) {
      if (disabledReason) {
        setContractSubmitError(disabledReason);
      }
      return;
    }

    try {
      if (__DEV__) {
        console.log("[ContractReview][accept:start]", {
          bookingIdSource: bookingIdSource || "none",
          bookingIdPresent,
          hasSignatureName,
          reviewedFullAgreement,
          agreedToRentalAgreement,
        });
      }

      setContractAccepting(true);
      setContractSubmitError("");
      setContractError("");
      const acceptedAt = new Date().toISOString();
      const payload = {
        contractAccepted: true,
        contractAcceptedName: normalizedTypedName,
        contractSignatureImage: "",
      };

      if (__DEV__) {
        console.log("[ContractReview][accept:payload]", {
          reviewedFullAgreement,
          agreedToRentalAgreement,
          payloadKeys: Object.keys(payload),
          hasAgreementConfirmation: Boolean(payload.contractAccepted === true),
          hasSignatureName: Boolean(payload.contractAcceptedName),
        });
      }

      const response = await acceptBookingContract(bookingId, payload, { rawResponse: true });
      const responseData = response?.data;
      const responseStatus = Number(response?.status || 0);
      const success = Boolean(
        (responseStatus >= 200 && responseStatus < 300) ||
          responseData?.success === true ||
          responseData?.contractAccepted === true ||
          responseData?.booking?.contractAccepted === true
      );

      if (__DEV__) {
        console.log("[ContractReview][accept:response]", {
          status: responseStatus || null,
          success,
          dataKeys: responseData && typeof responseData === "object" ? Object.keys(responseData) : [],
        });
      }

      if (!success) {
        throw {
          status: responseStatus,
          data: responseData,
          message:
            responseData?.message ||
            responseData?.error ||
            "Unable to accept contract. Please try again.",
        };
      }

      const updatedBooking =
        extractBookingFromResponse(responseData) ||
        responseData?.updatedBooking ||
        responseData?.booking ||
        null;
      const confirmedAcceptedAt =
        responseData?.contract?.acceptedAt ||
        responseData?.acceptedAt ||
        responseData?.booking?.contractAcceptedAt ||
        acceptedAt;
      const nextBooking = updatedBooking
        ? mergeBookingData(booking, updatedBooking)
        : mergeBookingData(booking, {
            contractAccepted: true,
            contractAcceptedAt: confirmedAcceptedAt,
            contractStatus: "accepted",
            requiresContract: true,
            contract: {
              ...(booking?.contract || {}),
              accepted: true,
              acceptedAt: confirmedAcceptedAt,
              status: "accepted",
            },
          });

      const acceptedBooking = mergeBookingData(nextBooking, {
        contractAccepted: true,
        contractAcceptedAt: confirmedAcceptedAt,
        contractStatus: "accepted",
        contract: {
          ...(nextBooking?.contract || {}),
          accepted: true,
          acceptedAt: confirmedAcceptedAt,
          status: "accepted",
          signatureName: normalizedTypedName,
        },
      });

      setBooking(acceptedBooking);
      setContractRecord((prev) => ({
        ...(prev || {}),
        ...(responseData || {}),
        contract: {
          ...(prev?.contract || {}),
          ...(responseData?.contract || {}),
          accepted: true,
          acceptedAt: confirmedAcceptedAt,
          status: "accepted",
          signatureName: normalizedTypedName,
        },
      }));

      DeviceEventEmitter.emit("contractAccepted", {
        bookingId,
        acceptedAt: confirmedAcceptedAt,
        updatedBooking: acceptedBooking,
      });

      if (__DEV__) {
        console.log("[ContractReview][accept:success]", {
          contractAccepted: true,
        });
      }

      Alert.alert("Contract accepted", "Contract accepted. You can now upload your payment proof.", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate({
              name: route?.params?.sourceRoute || "PaymentInstructions",
              params: {
                booking: acceptedBooking,
                bookingId,
                bookingReference,
                contractAccepted: true,
                refreshBooking: true,
              },
              merge: true,
            });
          },
        },
      ]);
    } catch (error) {
      const message = getFriendlyContractErrorMessage(
        error,
        "Unable to accept contract. Please try again."
      );
      if (__DEV__) {
        console.log("[ContractReview][accept:error]", {
          reachedResponse: Boolean(error?.response || error?.data),
          status: error?.response?.status || error?.status || null,
          message,
          responseData: error?.response?.data || error?.data || null,
          payloadKeys: ["contractAccepted", "contractAcceptedName", "contractSignatureImage"],
        });
      }
      logBookingDocsError("contractAccept", error);
      setContractSubmitError(message);
      Alert.alert("Unable to accept contract", message);
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
          {bookingLoading || contractLoading ? (
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

              {bookingWarning ? <Text style={styles.contractHelperText}>{bookingWarning}</Text> : null}
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
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.9}
                  onPress={() => {
                    setContractLoading(true);
                    setContractError("");
                    setContractNotice("");
                    setContractRecord(null);
                    setContractTemplate(null);
                    setBooking((prev) => ({ ...(prev || {}) }));
                  }}
                >
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
              onPress={() => {
                setContractSubmitError("");
                setReviewedFullAgreement((prev) => !prev);
              }}
            >
              <View style={[styles.checkbox, reviewedFullAgreement && styles.checkboxChecked]}>
                {reviewedFullAgreement ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.checkboxText}>I have reviewed the full rental agreement.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.85}
              onPress={() => {
                setContractSubmitError("");
                setAgreedToRentalAgreement((prev) => !prev);
              }}
            >
              <View style={[styles.checkbox, agreedToRentalAgreement && styles.checkboxChecked]}>
                {agreedToRentalAgreement ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.checkboxText}>
                I have read and agree to the FleetX Vehicle Rental Agreement.
              </Text>
            </TouchableOpacity>

            <TextInput
              value={signatureName}
              onChangeText={(value) => {
                setContractSubmitError("");
                setSignatureName(value);
              }}
              placeholder="Type your full name exactly as shown"
              placeholderTextColor="#98A2B3"
              style={styles.signatureInput}
              autoCapitalize="words"
            />
            <Text style={styles.contractHelperText}>Enter your name as shown: {expectedName || "Not available"}</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.9}
              onPress={() => {
                setContractSubmitError("");
                setSignatureName(expectedName);
              }}
            >
              <Text style={styles.secondaryButtonText}>Copy name</Text>
            </TouchableOpacity>
            {!exactNameMatch && hasSignatureName ? (
              <Text style={styles.inlineErrorText}>Please type your full name exactly as shown.</Text>
            ) : null}
            {!hasCheckedAgreement && !contractAccepting ? (
              <Text style={styles.inlineErrorText}>
                Please review and agree to the FleetX Rental Agreement.
              </Text>
            ) : null}
            {(contractSubmitError ||
              (disabledReason && hasCheckedAgreement && !(hasSignatureName && !exactNameMatch))) &&
            !contractAccepting ? (
              <Text style={styles.inlineErrorText}>{contractSubmitError || disabledReason}</Text>
            ) : null}

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
