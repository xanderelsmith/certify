import { Participant } from '../types';

export const exportParticipantsToCSV = (participants: Participant[]): void => {
  const headers = [
    'ID',
    'Full Name',
    'Old District',
    'Programme Location',
    'Gender',
    'Designation',
    'Phone',
    'Email',
    'School Name',
    'School Address',
    'School Type',
    'Registration Date',
    'Certificate ID'
  ];

  const rows = participants.map(p => [
    `"${p.id || ''}"`,
    `"${(p.fullName || '').replace(/"/g, '""')}"`,
    `"${(p.oldDistrict || '').replace(/"/g, '""')}"`,
    `"${(p.programmeLocation || '').replace(/"/g, '""')}"`,
    `"${p.gender || ''}"`,
    `"${(p.designation || '').replace(/"/g, '""')}"`,
    `"${p.phone || ''}"`,
    `"${p.email || ''}"`,
    `"${(p.schoolName || '').replace(/"/g, '""')}"`,
    `"${(p.schoolAddress || '').replace(/"/g, '""')}"`,
    `"${(p.schoolType || '').replace(/"/g, '""')}"`,
    `"${p.registrationDate || ''}"`,
    `"${p.certId || ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Educators_Forum_Participants_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSVToParticipants = (csvText: string): Participant[] => {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  // Parse header line to locate columns
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
    const matches = lines[i].match(/(?:[^\s,"]|"(?:\\.|[^"])*")+/g);
    if (!matches || matches.length < 2) continue;

    const row = matches.map(val => val.replace(/^"(.*)"$/, '$1').replace(/""/g, '"').trim());

    const fullName = (nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : row[1] || '').trim();
    if (!fullName) continue;

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
      id: `GF-${Date.now().toString().slice(-4)}-${i}`,
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
