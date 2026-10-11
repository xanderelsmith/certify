import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Participant, CertificateTemplateConfig } from '../types';

// Convert hex color to rgb (0 - 1)
const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return rgb(r, g, b);
};

export async function generateCertificatePdfBytes(
  participant: Participant,
  config: CertificateTemplateConfig
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;

  try {
    if (config.customPdfDataUrl) {
      // Decode base64 custom PDF
      const base64Data = config.customPdfDataUrl.split(',')[1] || config.customPdfDataUrl;
      const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      pdfDoc = await PDFDocument.load(pdfBytes);
    } else {
      // Load default PDF template from public folder
      const res = await fetch(config.pdfTemplateUrl);
      if (!res.ok) throw new Error('Could not load base PDF template');
      const arrayBuffer = await res.arrayBuffer();
      pdfDoc = await PDFDocument.load(arrayBuffer);
    }
  } catch (err) {
    console.warn('Template fetch failed, creating fallback blank certificate document:', err);
    pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([842, 595]);
  }

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  // Load fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const getFont = (family: string) => {
    switch (family) {
      case 'Helvetica-Bold':
        return helveticaBold;
      case 'Times-Roman':
        return timesRoman;
      case 'Times-Bold':
        return timesBold;
      default:
        return helveticaFont;
    }
  };

  // ONLY Render Participant Name (all other text/signatures are already baked into the PDF graphic)
  if (config.nameField.enabled) {
    const font = getFont(config.nameField.fontFamily);
    const text = config.nameField.isUppercase
      ? participant.fullName.toUpperCase()
      : participant.fullName;
    const textSize = config.nameField.fontSize;
    const textWidth = font.widthOfTextAtSize(text, textSize);

    let drawX = (config.nameField.x / 100) * width;
    if (config.nameField.align === 'center') {
      drawX = drawX - textWidth / 2;
    } else if (config.nameField.align === 'right') {
      drawX = drawX - textWidth;
    }

    // Convert top-down percentage to bottom-up PDF points
    const drawY = height - (config.nameField.y / 100) * height;

    firstPage.drawText(text, {
      x: drawX,
      y: drawY,
      size: textSize,
      font,
      color: hexToRgb(config.nameField.color || '#1e293b'),
    });
  }

  return await pdfDoc.save();
}

export async function downloadCertificatePdf(
  participant: Participant,
  config: CertificateTemplateConfig
): Promise<void> {
  const pdfBytes = await generateCertificatePdfBytes(participant, config);
  const blob = new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const cleanName = participant.fullName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `Certificate_${cleanName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function previewCertificatePdf(
  participant: Participant,
  config: CertificateTemplateConfig
): Promise<string> {
  const pdfBytes = await generateCertificatePdfBytes(participant, config);
  const blob = new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
