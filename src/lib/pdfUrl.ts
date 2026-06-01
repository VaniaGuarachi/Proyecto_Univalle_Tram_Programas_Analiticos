export function pdfViewerUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\/res\.cloudinary\.com\//i.test(path)) {
    return `/api/pdf?src=${encodeURIComponent(path)}`;
  }
  return path;
}
