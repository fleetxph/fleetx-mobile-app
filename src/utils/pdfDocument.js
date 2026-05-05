import { downloadPdf, openPdf, sharePdf, TOKEN_KEYS } from "./pdfUtils";

export async function openProtectedPdf({
  url,
  bookingReference,
  documentReference,
  type = "document",
  title = "Document",
}) {
  return openPdf({
    source: url,
    fileName: `${type}-${documentReference || bookingReference || "document"}.pdf`,
    bookingReference,
    documentReference,
    type,
    title,
  });
}

export async function shareDocumentLink({
  url,
  bookingReference,
  documentReference,
  type = "document",
  title = "Document",
  mode = "share",
}) {
  const payload = {
    source: url,
    fileName: `${type}-${documentReference || bookingReference || "document"}.pdf`,
    bookingReference,
    documentReference,
    type,
    title,
  };

  if (mode === "download") {
    return downloadPdf(payload);
  }

  return sharePdf(payload);
}

export { TOKEN_KEYS };
