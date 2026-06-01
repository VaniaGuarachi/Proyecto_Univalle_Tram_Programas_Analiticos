export function pdfViewerUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(path)) {
    return `/api/pdf?src=${encodeURIComponent(path)}`;
  }
  return path;
}

export function pdfDownloadUrl(path: string | null | undefined, filename?: string | null) {
  const viewerUrl = pdfViewerUrl(path);
  if (!viewerUrl) return null;
  const safeName = (filename || "documento.pdf")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const finalName = safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;

  const separator = viewerUrl.includes("?") ? "&" : "?";
  return `${viewerUrl}${separator}download=1&filename=${encodeURIComponent(finalName)}`;
}
