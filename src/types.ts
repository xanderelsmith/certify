export interface Participant {
  id: string;
  fullName: string;
  oldDistrict: string;
  programmeLocation: string;
  gender: 'Male' | 'Female' | string;
  designation: string;
  phone: string;
  email: string;
  schoolName: string;
  schoolAddress: string;
  schoolType: string;
  registrationDate: string;
  certId?: string;
}

export interface TextOverlayConfig {
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  fontSize: number; // in pt
  fontFamily: 'Helvetica' | 'Times-Roman' | 'Courier' | 'Helvetica-Bold';
  color: string; // Hex e.g. #000000 or #15803d
  isUppercase: boolean;
  align: 'left' | 'center' | 'right';
  enabled: boolean;
}

export interface ImageOverlayConfig {
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  width: number; // in px / pt
  height: number; // in px / pt
  dataUrl: string; // base64 string or image url
  label: string;
  enabled: boolean;
}

export interface CertificateTemplateConfig {
  pdfTemplateUrl: string;
  customPdfDataUrl?: string; // If user uploaded a custom PDF
  pageWidth: number;
  pageHeight: number;
  nameField: TextOverlayConfig;
  designationField: TextOverlayConfig;
  schoolField: TextOverlayConfig;
  dateField: TextOverlayConfig;
  certNumberField: TextOverlayConfig;
  signature1: ImageOverlayConfig;
  signature2: ImageOverlayConfig;
}

export interface GoogleFormConfig {
  formId: string;
  formActionUrl: string;
  enabled: boolean;
  fieldMappings: {
    oldDistrict: string;
    programmeLocation: string;
    fullName: string;
    gender: string;
    designation: string;
    phone: string;
    email: string;
    schoolName: string;
    schoolAddress: string;
    schoolType: string;
  };
}
