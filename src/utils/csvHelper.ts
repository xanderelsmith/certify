import { Participant } from '../types';

export const exportParticipantsToCSV = (participants: Participant[]): void => {
  const headers = ['Full Name', 'Email', 'Certificate ID', 'Registration Date'];

  const rows = participants.map(p => [
    `"${(p.fullName || '').replace(/"/g, '""')}"`,
    `"${(p.email || '').replace(/"/g, '""')}"`,
    `"${p.certId || ''}"`,
    `"${p.registrationDate || ''}"`
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

// Robust CSV row splitter that handles quoted commas, quotes, and tabs
function parseCsvRow(rowText: string): string[] {
  // If tab-delimited (common in copy-paste from Excel)
  if (rowText.includes('\t') && !rowText.includes(',')) {
    return rowText.split('\t').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
  }

  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];

    if (char === '"') {
      if (inQuotes && rowText[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export const parseCSVToParticipants = (csvText: string): Participant[] => {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  // Parse header line to dynamically locate columns
  const headerCols = parseCsvRow(lines[0]).map(h => h.toLowerCase().trim());

  const findIdx = (keywords: string[]): number => {
    return headerCols.findIndex(h => keywords.some(k => h === k || h.includes(k)));
  };

  // Specific check for separate Surname vs First Name columns in Excel
  const surnameIdx = findIdx(['surname', 'last name', 'lastname', 'family name']);
  const firstNameIdx = findIdx(['first name', 'firstname', 'given name']);
  const otherNamesIdx = findIdx(['other name', 'other names', 'middle name', 'middlename']);
  const fullNameIdx = findIdx(['full name', 'fullname', 'participant', 'name of participant', "participant's full name", 'name']);
  const emailIdx = findIdx(['email', 'email address', 'mail', 'e-mail']);

  const participants: Participant[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    if (!row || row.length === 0 || row.every(val => !val)) continue;

    let computedFullName = '';

    // If Excel has separate columns for Surname and First Name, COMBINE THEM!
    if (surnameIdx !== -1 && firstNameIdx !== -1) {
      const surname = row[surnameIdx] || '';
      const firstName = row[firstNameIdx] || '';
      const otherNames = otherNamesIdx !== -1 ? (row[otherNamesIdx] || '') : '';
      computedFullName = [surname, firstName, otherNames].filter(Boolean).join(' ').trim();
    } else if (fullNameIdx !== -1 && row[fullNameIdx]) {
      // If there's a Full Name column, use it directly
      computedFullName = row[fullNameIdx].trim();
      // If there is also an additional other names column, append it
      if (otherNamesIdx !== -1 && row[otherNamesIdx] && !computedFullName.toLowerCase().includes(row[otherNamesIdx].toLowerCase())) {
        computedFullName = `${computedFullName} ${row[otherNamesIdx]}`.trim();
      }
    } else if (surnameIdx !== -1 && row[surnameIdx]) {
      // If only surname matched, check if next column is first name
      const surname = row[surnameIdx];
      const nextCol = row[surnameIdx + 1] || '';
      computedFullName = nextCol && !nextCol.includes('@') ? `${surname} ${nextCol}`.trim() : surname;
    } else {
      // Fallback: search for first non-date, non-email column
      const nameCand = row.find(val => val && !val.includes('@') && !val.match(/^\d{4}-\d{2}-\d{2}/) && isNaN(Number(val)));
      computedFullName = nameCand || `PARTICIPANT ${i}`;
    }

    // Email extraction
    let email = '';
    if (emailIdx !== -1 && row[emailIdx]) {
      email = row[emailIdx].trim();
    } else {
      const emailCand = row.find(val => val && val.includes('@'));
      if (emailCand) email = emailCand.trim();
    }

    if (!computedFullName.trim()) continue;

    participants.push({
      id: `EXCEL-${Date.now().toString().slice(-4)}-${i}`,
      fullName: computedFullName.trim(), // Keep complete name including surname and first name
      email: email.trim(),
      oldDistrict: '',
      programmeLocation: '',
      gender: '',
      designation: '',
      phone: '',
      schoolName: '',
      schoolAddress: '',
      schoolType: '',
      registrationDate: new Date().toISOString().slice(0, 10),
      certId: `EDUS25-${1000 + i}`
    });
  }

  return participants;
};
