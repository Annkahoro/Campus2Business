import { PDFParse } from 'pdf-parse';

export const CV_TEXT_MAX_CHARS = 12000;

/**
 * Extracts plain text from a PDF buffer (used only as AI context).
 * Returns '' for scanned/image-only PDFs or unreadable files; never throws, so a CV can still be stored.
 */
export async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return (result.text ?? '')
      .replace(/\r/g, '')
      .replace(/^-- \d+ of \d+ --$/gm, '') // pdf-parse v2 page separators
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, CV_TEXT_MAX_CHARS);
  } catch (err) {
    console.warn('⚠️  CV text extraction failed:', err.message);
    return '';
  } finally {
    await parser.destroy().catch(() => {});
  }
}

/** Cheap sanity check before parsing: real PDFs start with "%PDF-". */
export const looksLikePdf = (buffer) => buffer?.subarray(0, 5).toString('latin1') === '%PDF-';
