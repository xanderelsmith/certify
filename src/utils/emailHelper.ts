import emailjs from '@emailjs/browser';
import { Participant } from '../types';
import { generateCertificatePdfBytes } from './pdfGenerator';

export interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  fromEmail: string;
  fromName: string;
}

const STORAGE_KEY = 'certify_email_config';

export const getStoredEmailConfig = (): EmailConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const saveStoredEmailConfig = (config: EmailConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const sendCertificateEmail = async (
  participant: Participant,
  templateConfig: any,
  emailConfig: EmailConfig
): Promise<{ success: boolean; error?: string }> => {
  if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
    return { success: false, error: 'EmailJS not configured. Open Settings to configure.' };
  }

  if (!participant.email) {
    return { success: false, error: 'Participant has no email address.' };
  }

  try {
    emailjs.init(emailConfig.publicKey);

    const pdfBytes = await generateCertificatePdfBytes(participant, templateConfig);
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
    const fileName = `Certificate_${participant.fullName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    const templateParams = {
      to_email: participant.email,
      to_name: participant.fullName,
      from_email: emailConfig.fromEmail,
      from_name: emailConfig.fromName,
      subject: `Your Certificate - ${participant.certId || 'EDUS2025'}`,
      message: `Dear ${participant.fullName},\n\nPlease find your certificate attached.\n\nCertificate ID: ${participant.certId || 'EDUS2025'}\nDesignation: ${participant.designation}\nSchool: ${participant.schoolName}\n\nBest regards,\n${emailConfig.fromName}`,
      attachment: base64Pdf,
      attachment_name: fileName,
    };

    await emailjs.send(emailConfig.serviceId, emailConfig.templateId, templateParams);
    return { success: true };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.text || error.message || 'Failed to send email' };
  }
};

export const sendBulkCertificateEmails = async (
  participants: Participant[],
  templateConfig: any,
  emailConfig: EmailConfig,
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number; errors: string[] }> => {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    if (!participant.email) {
      failed++;
      errors.push(`${participant.fullName}: No email address`);
      onProgress?.(sent + failed, participants.length);
      continue;
    }

    const result = await sendCertificateEmail(participant, templateConfig, emailConfig);
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${participant.fullName}: ${result.error}`);
    }
    onProgress?.(sent + failed, participants.length);

    if (i < participants.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return { sent, failed, errors };
};