import { ComplianceRule } from '../../src/types.js';

export const DEFAULT_RULES: ComplianceRule[] = [
  {
    id: 'RULE_6_1_A_PRODUCT_NAME',
    name: 'Name and Description of Commodity',
    legalReference: 'Rule 6(1)(a)',
    description: 'Every package shall bear the name and description of the commodity contained therein.',
    requirement: 'The product name or generic/specific description must be clearly declared on the principal display panel or conspicuous surface.',
    severity: 'CRITICAL',
    enabled: true,
    version: '2011.amended.2022',
    category: 'MANDATORY'
  },
  {
    id: 'RULE_6_1_B_NET_QUANTITY',
    name: 'Standard Unit Net Quantity Declaration',
    legalReference: 'Rule 6(1)(b) read with Rule 12',
    description: 'The net quantity in terms of standard units of weight, measure or number must be conspicuously stated.',
    requirement: 'Must state weight in g/kg, volume in ml/l, length in cm/m, or count in N/U with approved metric symbols without extraneous qualifying words like "approx" or "jumbo".',
    severity: 'CRITICAL',
    enabled: true,
    version: '2011.amended.2022',
    category: 'QUANTITY'
  },
  {
    id: 'RULE_6_1_E_MRP_DECLARATION',
    name: 'Maximum Retail Price (MRP) & Tax Inclusion',
    legalReference: 'Rule 6(1)(e)',
    description: 'Retail sale price of the package shall be clearly declared as "Maximum or Max. Retail Price ... inclusive of all taxes" or "MRP Rs. ... incl. of all taxes".',
    requirement: 'Mandatory format: "MRP Rs. XX.XX (incl. of all taxes)" or "₹ XX.XX (incl. of all taxes)". Value must be unambiguous.',
    severity: 'CRITICAL',
    enabled: true,
    version: '2011.amended.2022',
    category: 'MRP'
  },
  {
    id: 'RULE_18_MRP_CONSISTENCY',
    name: 'Cross-Surface MRP Consistency',
    legalReference: 'Rule 18(1)',
    description: 'No retail package shall bear conflicting, dual, or altered MRP stickers/stamps.',
    requirement: 'MRP values detected across multiple images/surfaces must be identical. Conflicting or tampered prices represent a violation.',
    severity: 'CRITICAL',
    enabled: true,
    version: '2011',
    category: 'MRP'
  },
  {
    id: 'RULE_6_1_AB_MANUFACTURER_DETAILS',
    name: 'Manufacturer / Packer / Importer Identity & Address',
    legalReference: 'Rule 6(1)(ab)',
    description: 'The name and complete physical address of the manufacturer, or packer, or importer must be provided.',
    requirement: 'Must include complete street address, town/city, state, and postal PIN code so the entity is identifiable and traceable.',
    severity: 'CRITICAL',
    enabled: true,
    version: '2011.amended.2022',
    category: 'MANUFACTURER'
  },
  {
    id: 'RULE_6_1_D_DATE_OF_MANUFACTURE',
    name: 'Month and Year of Manufacture / Packing',
    legalReference: 'Rule 6(1)(d)',
    description: 'Month and year in which the commodity is manufactured, packed or imported must be stated.',
    requirement: 'Format must follow "Mfg Date / Pkd: MM/YYYY" or "Month & Year: [Month, Year]".',
    severity: 'MAJOR',
    enabled: true,
    version: '2011.amended.2022',
    category: 'DATE'
  },
  {
    id: 'RULE_6_1_DA_BEST_BEFORE',
    name: 'Best Before / Expiry / Use By Date',
    legalReference: 'Rule 6(1)(da)',
    description: 'Best before or use by date for packages that may become unfit for human consumption.',
    requirement: 'Must be indicated if the commodity has a limited shelf life or is a food/perishable packaged item.',
    severity: 'MAJOR',
    enabled: true,
    version: '2011.amended.2022',
    category: 'DATE'
  },
  {
    id: 'RULE_6_2_CONSUMER_CARE',
    name: 'Consumer Care Cell Details',
    legalReference: 'Rule 6(2)',
    description: 'Name, address, telephone number, and email address of person/office for consumer complaints.',
    requirement: 'Must declare: (a) designation/name, (b) complete address, (c) active phone/toll-free number, and (d) valid email address.',
    severity: 'MAJOR',
    enabled: true,
    version: '2011.amended.2022',
    category: 'CONSUMER_CARE'
  },
  {
    id: 'RULE_6_1_F_COUNTRY_OF_ORIGIN',
    name: 'Country of Origin Declaration (Imported/Manufactured)',
    legalReference: 'Rule 6(1)(f)',
    description: 'Name of the country of origin or manufacture shall be mentioned on the package.',
    requirement: 'Must explicitly state "Country of Origin: [Country]" or "Made in [Country]".',
    severity: 'MAJOR',
    enabled: true,
    version: '2011.amended.2022',
    category: 'ORIGIN'
  },
  {
    id: 'RULE_7_READABILITY_CONTRAST',
    name: 'Declaration Conspicuousness, Legibility & Contrast',
    legalReference: 'Rule 7 read with Rule 9',
    description: 'Every declaration must be prominent, legible, clear and conspicuous with background contrast.',
    requirement: 'Text should not be obscured, illegible, curved beyond recognition, or printed in colors blending into the background.',
    severity: 'MAJOR',
    enabled: true,
    version: '2011',
    category: 'READABILITY'
  },
  {
    id: 'RULE_7_1_MINIMUM_FONT_SIZE',
    name: 'Minimum Font Size Requirements',
    legalReference: 'Rule 7(1) Table',
    description: 'Prescribes minimum height of numerals and letters based on net quantity or area of principal display panel.',
    requirement: 'Physical font size verification requires a calibrated reference scale/known packaging dimension. Standard camera perspectives cannot legally certify exact mm height.',
    severity: 'MINOR',
    enabled: true,
    version: '2011',
    category: 'FONT_SIZE'
  },
  {
    id: 'RULE_9_PLACEMENT_PDP',
    name: 'Placement on Principal Display Panel (PDP)',
    legalReference: 'Rule 9',
    description: 'Declarations of name and net quantity must be grouped on the Principal Display Panel.',
    requirement: 'Key identifiers should be prominently visible on the primary front-facing visual surface.',
    severity: 'MINOR',
    enabled: true,
    version: '2011',
    category: 'PLACEMENT'
  }
];
