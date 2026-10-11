export const OLD_DISTRICTS = [
  'Old Ebute',
  'Old Ikorodu Central',
  'Old Odogunyan'
];

export const PROGRAMME_LOCATIONS = [
  'Igbogbo - Old Ebute',
  'Elepe - Old IKD Central',
  'Imota - Old IKD Central',
  'Maya - Old IKD Central',
  'Sabo - Old IKD Central',
  'Agbede - Old Odogunyan',
  'Odogunyan - Old odogunyan',
  'OriOkuta - Old odogunyan'
];

export const DISTRICT_TO_LOCATIONS: Record<string, string[]> = {
  'Old Ebute': ['Igbogbo - Old Ebute'],
  'Old Ikorodu Central': [
    'Elepe - Old IKD Central',
    'Imota - Old IKD Central',
    'Maya - Old IKD Central',
    'Sabo - Old IKD Central'
  ],
  'Old Odogunyan': [
    'Agbede - Old Odogunyan',
    'Odogunyan - Old odogunyan',
    'OriOkuta - Old odogunyan'
  ]
};

export const GENDERS = ['Male', 'Female'];

export const DESIGNATIONS = [
  'School Owner',
  'Principal/Head Teacher',
  'Educator',
  'Admin Staff'
];

export const SCHOOL_TYPES = [
  'Public Primary',
  'Private Nursery/Primary',
  'Public Secondary',
  'Private Secondary',
  'Group of Schools',
  'Online School'
];
