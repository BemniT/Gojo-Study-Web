const CURRENT_YEAR = new Date().getFullYear();

export const MARITAL_STATUS_OPTIONS = ['', 'Single', 'Married', 'Divorced', 'Widowed', 'Separated'];

export const ETHIOPIAN_BANK_OPTIONS = [
  '',
  'Commercial Bank of Ethiopia', 'Development Bank of Ethiopia', 'Awash Bank', 'Bank of Abyssinia',
  'Dashen Bank', 'Wegagen Bank', 'United Bank', 'Nib International Bank',
  'Cooperative Bank of Oromia', 'Lion International Bank', 'Zemen Bank', 'Oromia International Bank',
  'Bunna Bank', 'Berhan Bank', 'Abay Bank', 'Addis International Bank',
  'Debub Global Bank', 'Enat Bank', 'Rammis Bank', 'Hibret Bank',
  'Tsehay Bank', 'Hijra Bank', 'Siinqee Bank', 'Gadaa Bank',
  'Ahadu Bank', 'Amhara Bank', 'Shabelle Bank', 'Goh Betoch Bank',
  'ZamZam Bank', 'Tsedey Bank',
];

export const COUNTRY_OPTIONS = [
  '',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina',
  'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados',
  'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina',
  'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
  'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
  'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini',
  'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
  'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone',
  'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea',
  'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

export const HIGHEST_QUALIFICATION_OPTIONS = [
  '', 'High School', 'Certificate', 'Diploma',
  "Bachelor's Degree", "Master's Degree", 'PhD', 'Other',
];

export const GRADUATION_YEAR_OPTIONS = [
  '',
  ...Array.from({ length: CURRENT_YEAR - 1949 }, (_, index) => String(CURRENT_YEAR - index)),
];

export const ROLE_OPTIONS = [
  { label: 'Teacher', value: 'teacher' },
  { label: 'School Admins', value: 'school_admins' },
  { label: 'Finance', value: 'finance' },
  { label: 'HR', value: 'hr' },
  { label: 'Other', value: 'other' },
];

export const FORM_SECTIONS = [
  { key: 'personal', label: 'Personal' },
  { key: 'contact', label: 'Contact' },
  { key: 'education', label: 'Education' },
  { key: 'family', label: 'Family' },
  { key: 'employment', label: 'Employment' },
  { key: 'financial', label: 'Financial' },
];
