/**
 * Rules for the optional notice upload. `storage.rules` enforces the same size
 * and types, and `createCheckoutSession` inspects the file's contents before
 * checkout opens — keep all three in step.
 */

export const MAX_NOTICE_BYTES = 10 * 1024 * 1024;

/** Accepted extensions and the content type each is uploaded with. */
const NOTICE_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain'
};

export const NOTICE_ACCEPT = Object.keys(NOTICE_TYPES)
  .map(extension => `.${extension}`)
  .join(',');

/**
 * The content type to upload with. Taken from the extension rather than
 * `file.type`, which browsers often leave empty for Word files on Windows.
 */
export function noticeContentType(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return NOTICE_TYPES[extension] ?? null;
}

/** A message to show the visitor when the file cannot be uploaded, or null when it can. */
export function noticeFileProblem(file: File): string | null {
  if (!noticeContentType(file)) {
    return 'Please choose a PDF, Word (.doc or .docx) or text file.';
  }
  if (file.size === 0) {
    return 'That file is empty. Please choose another.';
  }
  if (file.size >= MAX_NOTICE_BYTES) {
    return 'That file is over 10 MB. Please choose a smaller file, or email it to admin@blackwoodops.com after checkout.';
  }
  return null;
}
