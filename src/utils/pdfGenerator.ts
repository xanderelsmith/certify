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
      // Load default PDF from public folder
      const res = await fetch(config.pdfTemplateUrl);
      if (!res.ok) throw new Error('Could not load base PDF template');
      const arrayBuffer = await res.arrayBuffer();
      pdfDoc = await PDFDocument.load(arrayBuffer);
    }
  } catch (err) {
    console.warn('Template fetch failed, creating fallback blank certificate document:', err);
    // Create fallback blank A4 landscape canvas
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

  // 1. Render Participant Name
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

    // In PDF, Y = 0 is at bottom, so convert top-down % to bottom-up points
    const drawY = height - (config.nameField.y / 100) * height;

    firstPage.drawText(text, {
      x: drawX,
      y: drawY,
      size: textSize,
      font,
      color: hexToRgb(config.nameField.color || '#1e293b'),
    });
  }

  // 2. Render Designation Field
  if (config.designationField.enabled && participant.designation) {
    const font = getFont(config.designationField.fontFamily);
    const text = config.designationField.isUppercase
      ? participant.designation.toUpperCase()
      : participant.designation;
    const textSize = config.designationField.fontSize;
    const textWidth = font.widthOfTextAtSize(text, textSize);

    let drawX = (config.designationField.x / 100) * width;
    if (config.designationField.align === 'center') {
      drawX = drawX - textWidth / 2;
    } else if (config.designationField.align === 'right') {
      drawX = drawX - textWidth;
    }
    const drawY = height - (config.designationField.y / 100) * height;

    firstPage.drawText(text, {
      x: drawX,
      y: drawY,
      size: textSize,
      font,
      color: hexToRgb(config.designationField.color || '#475569'),
    });
  }

  // 3. Render School Name Field
  if (config.schoolField.enabled && participant.schoolName) {
    const font = getFont(config.schoolField.fontFamily);
    const text = config.schoolField.isUppercase
      ? participant.schoolName.toUpperCase()
      : participant.schoolName;
    const textSize = config.schoolField.fontSize;
    const textWidth = font.widthOfTextAtSize(text, textSize);

    let drawX = (config.schoolField.x / 100) * width;
    if (config.schoolField.align === 'center') {
      drawX = drawX - textWidth / 2;
    } else if (config.schoolField.align === 'right') {
      drawX = drawX - textWidth;
    }
    const drawY = height - (config.schoolField.y / 100) * height;

    firstPage.drawText(text, {
      x: drawX,
      y: drawY,
      size: textSize,
      font,
      color: hexToRgb(config.schoolField.color || '#0f766e'),
    });
  }

  // 4. Render Date Field
  if (config.dateField.enabled) {
    const font = getFont(config.dateField.fontFamily);
    const text = participant.registrationDate ? `Date: ${participant.registrationDate.slice(0, 10)}` : 'September 2025';
    const textSize = config.dateField.fontSize;
    const textWidth = font.widthOfTextAtSize(text, textSize);

    let drawX = (config.dateField.x / 100) * width;
    if (config.dateField.align === 'center') {
      drawX = drawX - textWidth / 2;
    } else if (config.dateField.align === 'right') {
      drawX = drawX - textWidth;
    }
    const drawY = height - (config.dateField.y / 100) * height;

    firstPage.drawText(text, {
      x: drawX,
      y: drawY,
      size: textSize,
      font,
      color: hexToRgb(config.dateField.color || '#334155'),
    });
  }

  // 5. Render Certificate / Serial ID
  if (config.certNumberField.enabled) {
    const font = getFont(config.certNumberField.fontFamily);
    const text = `Cert ID: ${participant.certId || participant.id || 'EF-2025'}`;
    const textSize = config.certNumberField.fontSize;
    const textWidth = font.widthOfTextAtSize(text, textSize);

    let drawX = (config.certNumberField.x / 100) * width;
    if (config.certNumberField.align === 'center') {
      drawX = drawX - textWidth / 2;
    } else if (config.certNumberField.align === 'right') {
      drawX = drawX - textWidth;
    }
    const drawY = height - (config.certNumberField.y / 100) * height;

    firstPage.drawText(text, {
      x: drawX,
      y: drawY,
      size: textSize,
      font,
      color: hexToRgb(config.certNumberField.color || '#64748b'),
    });
  }

  // 6. Embed Signature 1 Image
  if (config.signature1.enabled && config.signature1.dataUrl) {
    try {
      const isPng = config.signature1.dataUrl.includes('image/png');
      const base64Data = config.signature1.dataUrl.split(',')[1] || config.signature1.dataUrl;
      const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const embeddedImg = isPng
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);

      const sigWidth = config.signature1.width;
      const sigHeight = config.signature1.height;
      const sigCenterX = (config.signature1.x / 100) * width;
      const sigCenterY = height - (config.signature1.y / 100) * height;

      firstPage.drawImage(embeddedImg, {
        x: sigCenterX - sigWidth / 2,
        y: sigCenterY - sigHeight / 2,
        width: sigWidth,
        height: sigHeight,
      });
    } catch (e) {
      console.warn('Could not embed Signature 1 image into PDF:', e);
    }
  }

  // 7. Embed Signature 2 Image
  if (config.signature2.enabled && config.signature2.dataUrl) {
    try {
      const isPng = config.signature2.dataUrl.includes('image/png');
      const base64Data = config.signature2.dataUrl.split(',')[1] || config.signature2.dataUrl;
      const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const embeddedImg = isPng
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);

      const sigWidth = config.signature2.width;
      const sigHeight = config.signature2.height;
      const sigCenterX = (config.signature2.x / 100) * width;
      const sigCenterY = height - (config.signature2.y / 100) * height;

      firstPage.drawImage(embeddedImg, {
        x: sigCenterX - sigWidth / 2,
        y: sigCenterY - sigHeight / 2,
        width: sigWidth,
        height: sigHeight,
      });
    } catch (e) {
      console.warn('Could not embed Signature 2 image into PDF:', e);
    }
  }

  return await pdfDoc.save();
}

export async function downloadCertificatePdf(
  participant: Participant,
  config: CertificateTemplateConfig
): Promise<void> {
  const pdfBytes = await generateCertificatePdfBytes(participant, config);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
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
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
