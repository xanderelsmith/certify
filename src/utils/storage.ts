import { Participant, CertificateTemplateConfig, GoogleFormConfig } from '../types';
import { INITIAL_PARTICIPANTS } from '../data/sampleData';

const PARTICIPANTS_KEY = 'educators_forum_participants_v1';
const TEMPLATE_KEY = 'educators_forum_cert_template_v1';
const GOOGLE_FORM_KEY = 'educators_forum_google_form_v1';

export const DEFAULT_TEMPLATE_CONFIG: CertificateTemplateConfig = {
  pdfTemplateUrl: '/certificate_template.pdf',
  pageWidth: 842, // A4 Landscape width in pt (approx)
  pageHeight: 595, // A4 Landscape height in pt (approx)
  nameField: {
    x: 50, // 50% horizontally centered
    y: 58, // 58% vertically from top
    fontSize: 14, // 14pt
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    isUppercase: true,
    align: 'center',
    enabled: true
  },
  designationField: {
    x: 50,
    y: 56,
    fontSize: 14,
    fontFamily: 'Helvetica',
    color: '#475569',
    isUppercase: false,
    align: 'center',
    enabled: true
  },
  schoolField: {
    x: 50,
    y: 61,
    fontSize: 13,
    fontFamily: 'Helvetica',
    color: '#0f766e',
    isUppercase: false,
    align: 'center',
    enabled: true
  },
  dateField: {
    x: 25,
    y: 82,
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#334155',
    isUppercase: false,
    align: 'left',
    enabled: true
  },
  certNumberField: {
    x: 75,
    y: 82,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#64748b',
    isUppercase: true,
    align: 'right',
    enabled: true
  },
  signature1: {
    x: 25,
    y: 72,
    width: 140,
    height: 50,
    dataUrl: '', // base64 string
    label: 'Signature 1',
    enabled: false
  },
  signature2: {
    x: 75,
    y: 72,
    width: 140,
    height: 50,
    dataUrl: '', // base64 string
    label: 'Signature 2',
    enabled: false
  }
};

export const DEFAULT_GOOGLE_FORM_CONFIG: GoogleFormConfig = {
  formId: '1Yk2IJgES1-h-ItqcoDrtNHCjuVDOpsRzaAjhSU-MbDw',
  formActionUrl: 'https://docs.google.com/forms/d/1Yk2IJgES1-h-ItqcoDrtNHCjuVDOpsRzaAjhSU-MbDw/formResponse',
  enabled: true,
  fieldMappings: {
    oldDistrict: 'entry.1890913358',
    programmeLocation: 'entry.1711921599',
    fullName: 'entry.1289053433',
    gender: 'entry.924388827',
    designation: 'entry.187015370',
    phone: 'entry.431399210',
    email: 'entry.1686334740',
    schoolName: 'entry.1677345138',
    schoolAddress: 'entry.384735814',
    schoolType: 'entry.68126755'
  }
};

// Storage Functions
export const getStoredParticipants = (): Participant[] => {
  try {
    const raw = localStorage.getItem(PARTICIPANTS_KEY);
    if (!raw) return [];
    const list: Participant[] = JSON.parse(raw);
    // Filter out dummy items
    const cleanList = list.filter(
      p => !['PART-001', 'PART-002', 'PART-003', 'PART-004'].includes(p.id)
    );
    if (cleanList.length !== list.length) {
      localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(cleanList));
    }
    return cleanList;
  } catch (err) {
    console.error('Failed to parse participants from localStorage:', err);
    return [];
  }
};

export const clearAllStoredParticipants = (): void => {
  localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify([]));
};

export const saveStoredParticipants = (participants: Participant[]): void => {
  localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
};

export const getStoredTemplateConfig = (): CertificateTemplateConfig => {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) return DEFAULT_TEMPLATE_CONFIG;
    const parsed = JSON.parse(raw);
    // If stored config still has the old default fontSize 26 or y 48, update to new default
    if (parsed.nameField && (parsed.nameField.fontSize === 26 || parsed.nameField.y === 48)) {
      const updated = {
        ...DEFAULT_TEMPLATE_CONFIG,
        ...parsed,
        nameField: {
          ...parsed.nameField,
          x: 50,
          y: 58,
          fontSize: 14
        }
      };
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify(updated));
      return updated;
    }
    return { ...DEFAULT_TEMPLATE_CONFIG, ...parsed };
  } catch (err) {
    console.error('Failed to parse template config:', err);
    return DEFAULT_TEMPLATE_CONFIG;
  }
};

export const saveStoredTemplateConfig = (config: CertificateTemplateConfig): void => {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(config));
};

export const getStoredGoogleFormConfig = (): GoogleFormConfig => {
  try {
    const raw = localStorage.getItem(GOOGLE_FORM_KEY);
    if (!raw) return DEFAULT_GOOGLE_FORM_CONFIG;
    const parsed = JSON.parse(raw);
    // If stored config still has dummy 100000x values, replace with the verified stone IDs
    if (parsed.fieldMappings && parsed.fieldMappings.oldDistrict === 'entry.1000001') {
      localStorage.setItem(GOOGLE_FORM_KEY, JSON.stringify(DEFAULT_GOOGLE_FORM_CONFIG));
      return DEFAULT_GOOGLE_FORM_CONFIG;
    }
    return {
      ...DEFAULT_GOOGLE_FORM_CONFIG,
      ...parsed,
      fieldMappings: {
        ...DEFAULT_GOOGLE_FORM_CONFIG.fieldMappings,
        ...(parsed.fieldMappings || {})
      }
    };
  } catch (err) {
    console.error('Failed to parse Google Form config:', err);
    return DEFAULT_GOOGLE_FORM_CONFIG;
  }
};

export const saveStoredGoogleFormConfig = (config: GoogleFormConfig): void => {
  localStorage.setItem(GOOGLE_FORM_KEY, JSON.stringify(config));
};
