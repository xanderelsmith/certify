import { Participant } from '../types';

export interface GoogleSyncSettings {
  sheetUrl: string;
  autoSync: boolean;
  syncIntervalSeconds: number;
}

export const DEFAULT_SYNC_SETTINGS: GoogleSyncSettings = {
  sheetUrl: '',
  autoSync: false,
  syncIntervalSeconds: 15,
};

const SYNC_SETTINGS_KEY = 'educators_forum_sync_settings_v1';

export const getStoredSyncSettings = (): GoogleSyncSettings => {
  try {
    const raw = localStorage.getItem(SYNC_SETTINGS_KEY);
    if (!raw) return DEFAULT_SYNC_SETTINGS;
    return { ...DEFAULT_SYNC_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SYNC_SETTINGS;
  }
};

export const saveStoredSyncSettings = (settings: GoogleSyncSettings): void => {
  localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(settings));
};

// Converts any Google Sheet URL or ID into a direct CSV export endpoint
export const convertToGoogleSheetCsvUrl = (inputUrlOrId: string): string => {
  let clean = inputUrlOrId.trim();
  if (!clean) return '';

  // If user passed a sheet ID directly
  if (!clean.includes('/')) {
    return `https://docs.google.com/spreadsheets/d/${clean}/gviz/tq?tqx=out:csv`;
  }

  // Extract /d/{SHEET_ID}/
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const sheetId = match[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  }

  // If already a pub?output=csv or export URL, use directly
  return clean;
};

// Fetch and parse responses from linked Google Sheet
export const fetchGoogleSheetResponses = async (sheetUrlOrId: string): Promise<Participant[]> => {
  const csvUrl = convertToGoogleSheetCsvUrl(sheetUrlOrId);
  if (!csvUrl) throw new Error('Please enter a valid Google Sheet URL or ID');

  // Use proxy endpoint to bypass any CORS restrictions
  const proxyUrl = `/api/proxy-sheet?url=${encodeURIComponent(csvUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet responses (${res.status} ${res.statusText})`);
  }

  const csvText = await res.text();
  return parseGoogleSheetCsv(csvText);
};

// Smart CSV parser for Google Form response sheets
export const parseGoogleSheetCsv = (csvText: string): Participant[] => {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  // Parse header line to dynamically locate columns
  const headerMatch = lines[0].match(/(?:[^\s,"]|"(?:\\.|[^"])*")+/g);
  if (!headerMatch) return [];

  const headers = headerMatch.map(h => h.replace(/^"(.*)"$/, '$1').trim().toLowerCase());

  const findColIndex = (keywords: string[]): number => {
    return headers.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));
  };

  const nameIdx = findColIndex(['full name', 'participant', 'surname', 'name']);
  const districtIdx = findColIndex(['district', 'old district']);
  const locationIdx = findColIndex(['programme location', 'location']);
  const genderIdx = findColIndex(['gender', 'sex']);
  const designationIdx = findColIndex(['designation', 'role', 'title']);
  const phoneIdx = findColIndex(['phone', 'whatsapp', 'mobile']);
  const emailIdx = findColIndex(['email', 'mail']);
  const schoolNameIdx = findColIndex(['name of your school', 'school name', 'school']);
  const addressIdx = findColIndex(['address', 'school address']);
  const schoolTypeIdx = findColIndex(['school type', 'type']);
  const timestampIdx = findColIndex(['timestamp', 'date', 'time']);

  const participants: Participant[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowMatches = lines[i].match(/(?:[^\s,"]|"(?:\\.|[^"])*")+/g);
    if (!rowMatches || rowMatches.length < 2) continue;

    const row = rowMatches.map(val => val.replace(/^"(.*)"$/, '$1').replace(/""/g, '"').trim());

    const fullName = (nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : row[1] || '').trim();
    if (!fullName) continue; // Skip blank entries

    const oldDistrict = (districtIdx !== -1 && row[districtIdx] ? row[districtIdx] : row[2] || 'Old Ikorodu Central').trim();
    const programmeLocation = (locationIdx !== -1 && row[locationIdx] ? row[locationIdx] : row[3] || 'Sabo - Old IKD Central').trim();
    const gender = (genderIdx !== -1 && row[genderIdx] ? row[genderIdx] : row[4] || 'Male').trim();
    const designation = (designationIdx !== -1 && row[designationIdx] ? row[designationIdx] : row[5] || 'Educator').trim();
    const phone = (phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx] : row[6] || '').trim();
    const email = (emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : row[7] || '').trim();
    const schoolName = (schoolNameIdx !== -1 && row[schoolNameIdx] ? row[schoolNameIdx] : row[8] || 'Educators Academy').trim();
    const schoolAddress = (addressIdx !== -1 && row[addressIdx] ? row[addressIdx] : row[9] || '').trim();
    const schoolType = (schoolTypeIdx !== -1 && row[schoolTypeIdx] ? row[schoolTypeIdx] : row[10] || 'Private Secondary').trim();
    const regDate = (timestampIdx !== -1 && row[timestampIdx] ? row[timestampIdx] : new Date().toISOString().slice(0, 10)).trim();

    participants.push({
      id: `GF-${i}-${fullName.replace(/\s+/g, '_').slice(0, 12)}`,
      fullName: fullName.toUpperCase(),
      oldDistrict,
      programmeLocation,
      gender,
      designation,
      phone,
      email,
      schoolName,
      schoolAddress,
      schoolType,
      registrationDate: regDate,
      certId: `EDUS25-${1000 + i}`
    });
  }

  return participants;
};

// Check for incoming entries from Google Form Webhook
export const pollWebhookEntries = async (): Promise<Participant[]> => {
  try {
    const res = await fetch('/api/webhook');
    if (!res.ok) return [];
    const entries: any[] = await res.json();
    if (!Array.isArray(entries) || entries.length === 0) return [];

    return entries.map((entry, idx) => ({
      id: `WH-${Date.now()}-${idx}`,
      fullName: (entry.fullName || entry['Participant\'s Full Name'] || 'PARTICIPANT').toUpperCase(),
      oldDistrict: entry.oldDistrict || entry['Old District'] || 'Old Ikorodu Central',
      programmeLocation: entry.programmeLocation || entry['Programme Location'] || 'Sabo - Old IKD Central',
      gender: entry.gender || entry['Gender'] || 'Male',
      designation: entry.designation || entry['Designation'] || 'Educator',
      phone: entry.phone || entry['Phone Number'] || '',
      email: entry.email || entry['Email'] || '',
      schoolName: entry.schoolName || entry['Name of Your School'] || 'Educators Academy',
      schoolAddress: entry.schoolAddress || entry['Address of Your School'] || '',
      schoolType: entry.schoolType || entry['School Type'] || 'Private Secondary',
      registrationDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
      certId: `EDUS25-${Math.floor(1000 + Math.random() * 9000)}`
    }));
  } catch {
    return [];
  }
};
