import { getStorage } from 'firebase-admin/storage';

/**
 * Inspects an uploaded notice before checkout opens. `storage.rules` already
 * caps size and declared type, but the declared type is whatever the browser
 * says; this reads the file itself.
 *
 * Rejected: files whose contents do not match their extension (an executable
 * renamed to .pdf), Word files carrying macros, and PDFs with scripts or
 * launch actions. This is a structural check, not a virus scan — staff should
 * still open uploads in Word's Protected View or a browser PDF viewer.
 *
 * Mirrors the accepted types in `src/app/shared/notice-file.ts`.
 */

const SIGNATURES = {
  pdf: Buffer.from('%PDF-'),
  zip: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  ole: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
};

/** Marks a VBA project inside a .docx (zip entry name, stored uncompressed). */
const DOCX_MACROS = /vbaProject\.bin|macroEnabled/i;
/** OLE storage names in a legacy .doc are UTF-16LE. */
const DOC_MACROS = [utf16('_VBA_PROJECT'), utf16('Macros')];
/** PDF actions that run code or open other programs. */
const PDF_ACTIVE = /\/(JavaScript|JS|Launch)\b/;

/** Thrown with a message safe to show the visitor. */
export class NoticeRejectedError extends Error {}

export async function checkNoticeUpload(path: string): Promise<void> {
  const file = getStorage().bucket().file(path);

  let contents: Buffer;
  try {
    [contents] = await file.download();
  } catch {
    throw new NoticeRejectedError(
      'We could not find your uploaded notice. Please attach it again and resubmit.'
    );
  }

  const problem = problemWith(extensionOf(path), contents);
  if (problem) {
    await file.delete({ ignoreNotFound: true });
    throw new NoticeRejectedError(problem);
  }
}

export function problemWith(extension: string, contents: Buffer): string | null {
  const mismatch = `That file does not look like a real .${extension} file. Please save it again and re-attach it, or email it to admin@blackwoodops.com after checkout.`;
  const macros =
    'That Word file contains macros, which we cannot accept. Please save it as a .docx or PDF without macros and re-attach it.';

  switch (extension) {
    case 'pdf': {
      // The header may follow a little junk; readers accept it within the first 1 KB.
      if (!contents.subarray(0, 1024).includes(SIGNATURES.pdf)) {
        return mismatch;
      }
      if (PDF_ACTIVE.test(contents.toString('latin1'))) {
        return 'That PDF contains scripts or actions we cannot accept. Please print it to a new PDF ("Microsoft Print to PDF") and re-attach it.';
      }
      return null;
    }

    case 'docx': {
      const text = contents.toString('latin1');
      if (!startsWith(contents, SIGNATURES.zip) || !text.includes('word/document')) {
        return mismatch;
      }
      return DOCX_MACROS.test(text) ? macros : null;
    }

    case 'doc':
      if (!startsWith(contents, SIGNATURES.ole)) {
        return mismatch;
      }
      return DOC_MACROS.some(marker => contents.includes(marker)) ? macros : null;

    case 'txt':
      // Text never contains NUL bytes; binaries almost always do.
      return contents.subarray(0, 8192).includes(0) ? mismatch : null;

    default:
      return 'Please attach a PDF, Word (.doc or .docx) or text file.';
  }
}

function extensionOf(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? '';
}

function startsWith(contents: Buffer, signature: Buffer): boolean {
  return contents.subarray(0, signature.length).equals(signature);
}

function utf16(value: string): Buffer {
  return Buffer.from(value, 'utf16le');
}
