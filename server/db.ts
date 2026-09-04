import fs from 'fs';
import path from 'path';
import {
  AuditEntry,
  ComplianceRule,
  DashboardMetrics,
  ExtractedDeclarations,
  ProductIdentity,
  RawExtractedImageText,
  RuleEvaluationResult,
  ScanImage,
  ScanSession,
  ScreeningScore,
  SideType,
  UserProfile
} from '../src/types.js';
import { evaluateComplianceRules } from './rules/ruleEngine.js';
import { DEFAULT_RULES } from './rules/ruleRegistry.js';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'inspectra_db.json');

interface InspectraDatabase {
  users: Record<string, UserProfile>;
  sessions: Record<string, ScanSession>;
  rules: ComplianceRule[];
  auditLogs: AuditEntry[];
  sessions_auth?: Record<string, { userId: string; createdAt: number; expiresAt: number }>;
}

let dbInstance: InspectraDatabase | null = null;

// Synthetic sample SVG image generators so demo images can be viewed and displayed with bounding boxes
function createPackageSvgDataUrl(
  title: string,
  side: string,
  details: string[],
  accentColor: string = '#2563EB',
  bgColor: string = '#18181B'
): string {
  const lines = details.map((d, i) => `<text x="50" y="${180 + i * 40}" fill="#E4E4E7" font-size="16" font-family="monospace">${d}</text>`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="${bgColor}"/>
    <rect x="20" y="20" width="560" height="560" rx="16" fill="none" stroke="${accentColor}" stroke-width="3" stroke-dasharray="8 4"/>
    <circle cx="50" cy="50" r="16" fill="${accentColor}"/>
    <text x="75" y="56" fill="#FAFAFA" font-size="18" font-weight="bold" font-family="sans-serif">INSPECTRA EVIDENCE CAMERA: [${side.toUpperCase()}]</text>
    <rect x="35" y="80" width="530" height="50" rx="8" fill="#27272A"/>
    <text x="50" y="112" fill="#38BDF8" font-size="20" font-weight="bold" font-family="sans-serif">${title}</text>
    <g transform="translate(0, 0)">
      ${lines}
    </g>
    <rect x="35" y="510" width="530" height="55" rx="8" fill="#27272A"/>
    <text x="50" y="542" fill="#A1A1AA" font-size="13" font-family="sans-serif">LEGAL METROLOGY INSPECTION SPECIMEN • HIGH RESOLUTION OPTICAL CAPTURE</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function initDb(): InspectraDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.sessions && parsed.users) {
        return parsed;
      }
    } catch (e) {
      console.warn('[INSPECTRA] Could not read db file, re-seeding database:', e);
    }
  }

  // Seed default admin and guest users
  const defaultUsers: Record<string, UserProfile> = {
    'usr_inspector_1': {
      id: 'usr_inspector_1',
      email: 'inspector@inspectra.gov.in',
      name: 'R. K. Sharma',
      role: 'INSPECTOR',
      organization: 'Department of Consumer Affairs, Legal Metrology Division',
      createdAt: '2026-01-15T09:00:00Z'
    },
    'usr_guest': {
      id: 'usr_guest',
      email: 'guest@inspectra.local',
      name: 'Public Guest User',
      role: 'GUEST',
      organization: 'Public / Citizen Inspection Portal',
      createdAt: '2026-02-01T10:00:00Z'
    }
  };

  const db: InspectraDatabase = {
    users: defaultUsers,
    sessions: {},
    rules: DEFAULT_RULES,
    auditLogs: []
  };

  // Generate the 5 required realistic demo scans
  const demoScans = createRealisticDemoScans(defaultUsers['usr_inspector_1'].id);
  for (const s of demoScans) {
    db.sessions[s.scanId] = s;
  }

  saveDb(db);
  return db;
}

function saveDb(db: InspectraDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[INSPECTRA] Failed to persist database to disk:', err);
  }
}

export function getDb(): InspectraDatabase {
  if (!dbInstance) {
    dbInstance = initDb();
  }
  return dbInstance;
}

export function persistDb() {
  if (dbInstance) {
    saveDb(dbInstance);
  }
}

export function resetDb(): InspectraDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      fs.unlinkSync(DB_FILE);
    } catch (e) {}
  }
  dbInstance = initDb();
  return dbInstance;
}

// 5 Realistic Demo Scans according to Prompt #39
function createRealisticDemoScans(defaultUserId: string): ScanSession[] {
  const now = new Date().toISOString();

  // 1. FULLY READABLE COMPLIANT PRODUCT
  const demo1Images: Record<SideType, ScanImage | null> = {
    front: {
      id: 'img_tata_f',
      side: 'front',
      previewUrl: createPackageSvgDataUrl(
        'TATA SALT - Vacuum Evaporated Iodised Salt',
        'front',
        [
          'TATA SALT (Brand Logo)',
          'Vacuum Evaporated Iodised Salt',
          'Net Quantity: 1 kg',
          'Country of Origin: India',
          'Desh Ka Namak'
        ],
        '#10B981'
      ),
      quality: {
        status: 'GOOD',
        resolution: 'High (1920x1080)',
        blurScore: 10,
        lighting: 'GOOD',
        textReadability: 'CLEAR',
        issues: []
      },
      uploadedAt: now,
      fileName: 'tata_salt_front.jpg'
    },
    back: {
      id: 'img_tata_b',
      side: 'back',
      previewUrl: createPackageSvgDataUrl(
        'TATA SALT - Mandatory Back Panel Declarations',
        'back',
        [
          'Mfd by: Tata Consumer Products Limited, 1, Bishop Lefroy Rd, Kolkata 700020',
          'Consumer Care: 1800-345-1720 | care@tataconsumer.com',
          'MRP Rs. 28.00 (incl. of all taxes)',
          'Pkd: 02/2026 | Best Before 24 months from packing',
          'Unit Sale Price: ₹ 0.028 / g'
        ],
        '#10B981'
      ),
      quality: {
        status: 'GOOD',
        resolution: 'High (1920x1080)',
        blurScore: 8,
        lighting: 'GOOD',
        textReadability: 'CLEAR',
        issues: []
      },
      uploadedAt: now,
      fileName: 'tata_salt_back.jpg'
    },
    upper: {
      id: 'img_tata_u',
      side: 'upper',
      previewUrl: createPackageSvgDataUrl(
        'TATA SALT - Top Seal & Batch Coding',
        'upper',
        ['BATCH: TCPL-0882A', 'HEAT SEALED INTEGRITY CHECK: PASS'],
        '#10B981'
      ),
      quality: {
        status: 'GOOD',
        resolution: 'Standard (1280x720)',
        blurScore: 12,
        lighting: 'GOOD',
        textReadability: 'CLEAR',
        issues: []
      },
      uploadedAt: now,
      fileName: 'tata_salt_upper.jpg'
    },
    lower: {
      id: 'img_tata_l',
      side: 'lower',
      previewUrl: createPackageSvgDataUrl(
        'TATA SALT - Bottom Barcode Panel',
        'lower',
        ['BARCODE: 8901030383821', 'RECYCLE LOGO: 04 LDPE'],
        '#10B981'
      ),
      quality: {
        status: 'GOOD',
        resolution: 'Standard (1280x720)',
        blurScore: 14,
        lighting: 'GOOD',
        textReadability: 'CLEAR',
        issues: []
      },
      uploadedAt: now,
      fileName: 'tata_salt_lower.jpg'
    }
  };

  const demo1Declarations: ExtractedDeclarations = {
    product_name: {
      key: 'product_name',
      label: 'Commodity Name & Description',
      value: 'Vacuum Evaporated Iodised Salt',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'front',
      evidence: {
        imageId: 'img_tata_f',
        side: 'front',
        textSnippet: 'Vacuum Evaporated Iodised Salt',
        boundingBox: { ymin: 300, xmin: 50, ymax: 420, xmax: 850 },
        confidence: 'HIGH'
      }
    },
    brand_name: {
      key: 'brand_name',
      label: 'Brand / Trade Name',
      value: 'TATA SALT',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'front',
      evidence: {
        imageId: 'img_tata_f',
        side: 'front',
        textSnippet: 'TATA SALT',
        boundingBox: { ymin: 150, xmin: 50, ymax: 260, xmax: 500 },
        confidence: 'HIGH'
      }
    },
    variant: {
      key: 'variant',
      label: 'Product Variant',
      value: 'Iodised Vacuum Evaporated',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'front',
      evidence: null
    },
    manufacturer: {
      key: 'manufacturer',
      label: 'Manufacturer Name',
      value: 'Tata Consumer Products Limited',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'back',
      evidence: {
        imageId: 'img_tata_b',
        side: 'back',
        textSnippet: 'Mfd by: Tata Consumer Products Limited',
        boundingBox: { ymin: 160, xmin: 50, ymax: 230, xmax: 900 },
        confidence: 'HIGH'
      }
    },
    packer: { key: 'packer', label: 'Packer Name', value: null, status: 'NOT_APPLICABLE', confidence: 'HIGH', sourceImage: null, evidence: null },
    importer: { key: 'importer', label: 'Importer Name', value: null, status: 'NOT_APPLICABLE', confidence: 'HIGH', sourceImage: null, evidence: null },
    manufacturer_address: {
      key: 'manufacturer_address',
      label: 'Manufacturer Complete Address',
      value: '1, Bishop Lefroy Road, Kolkata, West Bengal - 700020',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'back',
      evidence: {
        imageId: 'img_tata_b',
        side: 'back',
        textSnippet: '1, Bishop Lefroy Rd, Kolkata 700020',
        boundingBox: { ymin: 210, xmin: 50, ymax: 280, xmax: 920 },
        confidence: 'HIGH'
      }
    },
    packer_address: { key: 'packer_address', label: 'Packer Address', value: null, status: 'NOT_APPLICABLE', confidence: 'HIGH', sourceImage: null, evidence: null },
    importer_address: { key: 'importer_address', label: 'Importer Address', value: null, status: 'NOT_APPLICABLE', confidence: 'HIGH', sourceImage: null, evidence: null },
    net_quantity: {
      key: 'net_quantity',
      label: 'Net Quantity (Standard Metric)',
      value: '1 kg',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'front',
      evidence: {
        imageId: 'img_tata_f',
        side: 'front',
        textSnippet: 'Net Quantity: 1 kg',
        boundingBox: { ymin: 440, xmin: 50, ymax: 520, xmax: 550 },
        confidence: 'HIGH'
      }
    },
    mrp: {
      key: 'mrp',
      label: 'Maximum Retail Price (MRP incl. taxes)',
      value: '₹ 28.00 (incl. of all taxes)',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'back',
      evidence: {
        imageId: 'img_tata_b',
        side: 'back',
        textSnippet: 'MRP Rs. 28.00 (incl. of all taxes)',
        boundingBox: { ymin: 360, xmin: 50, ymax: 440, xmax: 750 },
        confidence: 'HIGH'
      }
    },
    manufacturing_or_packing_date: {
      key: 'manufacturing_or_packing_date',
      label: 'Month & Year of Mfg / Packing',
      value: '02/2026',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'back',
      evidence: {
        imageId: 'img_tata_b',
        side: 'back',
        textSnippet: 'Pkd: 02/2026',
        boundingBox: { ymin: 440, xmin: 50, ymax: 510, xmax: 450 },
        confidence: 'HIGH'
      }
    },
    best_before_or_expiry: {
      key: 'best_before_or_expiry',
      label: 'Best Before / Expiry Date',
      value: '24 months from packing',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'back',
      evidence: {
        imageId: 'img_tata_b',
        side: 'back',
        textSnippet: 'Best Before 24 months from packing',
        boundingBox: { ymin: 440, xmin: 450, ymax: 510, xmax: 900 },
        confidence: 'HIGH'
      }
    },
    import_date: { key: 'import_date', label: 'Import Date', value: null, status: 'NOT_APPLICABLE', confidence: 'HIGH', sourceImage: null, evidence: null },
    consumer_care_details: {
      key: 'consumer_care_details',
      label: 'Consumer Care Cell Details',
      value: '1800-345-1720 | care@tataconsumer.com',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'back',
      evidence: {
        imageId: 'img_tata_b',
        side: 'back',
        textSnippet: 'Consumer Care: 1800-345-1720 | care@tataconsumer.com',
        boundingBox: { ymin: 280, xmin: 50, ymax: 350, xmax: 950 },
        confidence: 'HIGH'
      }
    },
    country_of_origin: {
      key: 'country_of_origin',
      label: 'Country of Origin',
      value: 'India',
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'front',
      evidence: {
        imageId: 'img_tata_f',
        side: 'front',
        textSnippet: 'Country of Origin: India',
        boundingBox: { ymin: 530, xmin: 50, ymax: 600, xmax: 650 },
        confidence: 'HIGH'
      }
    },
    other_declarations: []
  };

  const demo1Identity: ProductIdentity = {
    brand: 'TATA SALT',
    productName: 'Vacuum Evaporated Iodised Salt',
    variant: 'Iodised Salt',
    netQuantity: '1 kg',
    visibleIdentifier: 'GTIN Barcode 8901030383821',
    packagingIdentifier: 'Flexible Laminated Moisture-Proof Poly Pouch',
    identityConfidence: 'HIGH',
    consistencyScore: 98,
    isConsistent: true,
    matchAssessment: 'All 4 photographs consistently represent the same physical Tata Salt pouch.',
    categoryDetermined: false,
    productCategory: null
  };

  const demo1RawTexts: Record<SideType, RawExtractedImageText | null> = {
    front: {
      imageId: 'img_tata_f',
      side: 'front',
      rawText: 'TATA SALT\nVacuum Evaporated Iodised Salt\nNet Quantity: 1 kg\nCountry of Origin: India\nDesh Ka Namak',
      textRegions: [
        { id: 'tr_1', text: 'TATA SALT', confidence: 'HIGH', side: 'front', boundingBox: { ymin: 150, xmin: 50, ymax: 260, xmax: 500 } },
        { id: 'tr_2', text: 'Vacuum Evaporated Iodised Salt', confidence: 'HIGH', side: 'front', boundingBox: { ymin: 300, xmin: 50, ymax: 420, xmax: 850 } },
        { id: 'tr_3', text: 'Net Quantity: 1 kg', confidence: 'HIGH', side: 'front', boundingBox: { ymin: 440, xmin: 50, ymax: 520, xmax: 550 } }
      ],
      readabilityAssessment: 'READABLE'
    },
    back: {
      imageId: 'img_tata_b',
      side: 'back',
      rawText: 'Mfd by: Tata Consumer Products Limited, 1, Bishop Lefroy Rd, Kolkata 700020\nConsumer Care: 1800-345-1720 | care@tataconsumer.com\nMRP Rs. 28.00 (incl. of all taxes)\nPkd: 02/2026 | Best Before 24 months from packing',
      textRegions: [
        { id: 'tr_4', text: 'Tata Consumer Products Limited', confidence: 'HIGH', side: 'back', boundingBox: { ymin: 160, xmin: 50, ymax: 230, xmax: 900 } },
        { id: 'tr_5', text: 'MRP Rs. 28.00 (incl. of all taxes)', confidence: 'HIGH', side: 'back', boundingBox: { ymin: 360, xmin: 50, ymax: 440, xmax: 750 } }
      ],
      readabilityAssessment: 'READABLE'
    },
    upper: { imageId: 'img_tata_u', side: 'upper', rawText: 'BATCH: TCPL-0882A', textRegions: [], readabilityAssessment: 'READABLE' },
    lower: { imageId: 'img_tata_l', side: 'lower', rawText: 'BARCODE: 8901030383821', textRegions: [], readabilityAssessment: 'READABLE' }
  };

  const eval1 = evaluateComplianceRules(demo1Declarations, demo1Identity, demo1RawTexts);

  const session1: ScanSession = {
    scanId: 'SCN-2026-0001',
    sessionId: 'sess_demo_1',
    userId: defaultUserId,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: 'COMPLETED',
    images: demo1Images,
    productIdentity: demo1Identity,
    rawExtractedText: demo1RawTexts,
    extractedDeclarations: demo1Declarations,
    ruleResults: eval1.ruleResults,
    screeningScore: eval1.screeningScore,
    evidenceList: [
      demo1Declarations.product_name.evidence!,
      demo1Declarations.net_quantity.evidence!,
      demo1Declarations.mrp.evidence!,
      demo1Declarations.manufacturer.evidence!,
      demo1Declarations.consumer_care_details.evidence!
    ],
    auditTrail: [
      { id: 'aud_1', timestamp: now, user: 'SYSTEM', action: 'SCAN_INITIALIZED', details: 'Four-sided capture ingested and normalized' },
      { id: 'aud_2', timestamp: now, user: 'GEMINI_AI', action: 'AI_EXTRACTION_COMPLETED', details: 'Multimodal text and declarations extracted with high confidence' },
      { id: 'aud_3', timestamp: now, user: 'RULE_ENGINE', action: 'COMPLIANCE_EVALUATED', details: '12 legal metrology rules evaluated deterministically' }
    ],
    isDemo: true,
    demoLabel: 'DEMO DATA: FULLY COMPLIANT PRODUCT'
  };

  // 2. MISSING DECLARATION EXAMPLE (Missing Consumer Care & Complete Postal Address)
  const demo2Declarations = JSON.parse(JSON.stringify(demo1Declarations));
  demo2Declarations.brand_name.value = 'GOLDEN HARVEST';
  demo2Declarations.product_name.value = 'Whole Cashew Nuts (W320)';
  demo2Declarations.consumer_care_details.value = null;
  demo2Declarations.consumer_care_details.status = 'NOT_DETECTED';
  demo2Declarations.consumer_care_details.evidence = null;
  demo2Declarations.manufacturer_address.value = 'Industrial Area, Phase 2 (Incomplete)';
  demo2Declarations.manufacturer_address.status = 'MANUAL_REVIEW';

  const demo2Identity: ProductIdentity = {
    brand: 'GOLDEN HARVEST',
    productName: 'Whole Cashew Nuts (W320)',
    variant: 'Grade W320',
    netQuantity: '500 g',
    visibleIdentifier: 'Batch GH-2991',
    packagingIdentifier: 'Vacuum Sealed Stand-Up Pouch',
    identityConfidence: 'HIGH',
    consistencyScore: 92,
    isConsistent: true,
    matchAssessment: 'Images match the same cashew nuts packaging.',
    categoryDetermined: false,
    productCategory: null
  };

  const eval2 = evaluateComplianceRules(demo2Declarations, demo2Identity, demo1RawTexts);

  const session2: ScanSession = {
    scanId: 'SCN-2026-0002',
    sessionId: 'sess_demo_2',
    userId: defaultUserId,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'COMPLETED',
    images: {
      front: {
        id: 'img_cashew_f',
        side: 'front',
        previewUrl: createPackageSvgDataUrl('GOLDEN HARVEST - Cashews W320', 'front', ['GOLDEN HARVEST', 'Whole Cashew Nuts W320', 'Net Qty: 500 g'], '#F59E0B'),
        quality: { status: 'GOOD', resolution: 'High', blurScore: 12, lighting: 'GOOD', textReadability: 'CLEAR', issues: [] },
        uploadedAt: now,
        fileName: 'cashew_front.jpg'
      },
      back: {
        id: 'img_cashew_b',
        side: 'back',
        previewUrl: createPackageSvgDataUrl('GOLDEN HARVEST - Back Panel (Missing Consumer Care)', 'back', ['Packed by: Premier Foods', 'Address: Industrial Area, Phase 2', 'MRP Rs. 450.00 (incl. taxes)', 'NO CONSUMER CARE DETAILS DETECTED'], '#EF4444'),
        quality: { status: 'GOOD', resolution: 'High', blurScore: 14, lighting: 'GOOD', textReadability: 'CLEAR', issues: [] },
        uploadedAt: now,
        fileName: 'cashew_back.jpg'
      },
      upper: null,
      lower: null
    },
    productIdentity: demo2Identity,
    rawExtractedText: demo1RawTexts,
    extractedDeclarations: demo2Declarations,
    ruleResults: eval2.ruleResults,
    screeningScore: eval2.screeningScore,
    evidenceList: [],
    auditTrail: [
      { id: 'aud_d2_1', timestamp: now, user: 'SYSTEM', action: 'SCAN_INITIALIZED', details: 'Ingested 2 of 4 package sides' },
      { id: 'aud_d2_2', timestamp: now, user: 'RULE_ENGINE', action: 'VIOLATIONS_DETECTED', details: 'Rule 6(2) Consumer Care missing & incomplete postal address' }
    ],
    isDemo: true,
    demoLabel: 'DEMO DATA: MISSING DECLARATION EXAMPLE'
  };

  // 3. CONFLICTING MRP EXAMPLE (Dual pricing / altered sticker)
  const demo3Declarations = JSON.parse(JSON.stringify(demo1Declarations));
  demo3Declarations.brand_name.value = 'HERITAGE SPICE';
  demo3Declarations.product_name.value = 'Special Garam Masala Blend';
  demo3Declarations.mrp.value = '₹ 95.00 (Front) vs ₹ 110.00 (Back)';
  demo3Declarations.mrp.inconsistencyFlag = true;
  demo3Declarations.mrp.alternativeValues = [
    { side: 'front', value: '₹ 95.00' },
    { side: 'back', value: '₹ 110.00 (Sticker)' }
  ];

  const demo3Identity: ProductIdentity = {
    brand: 'HERITAGE SPICE',
    productName: 'Special Garam Masala Blend',
    variant: 'Blend No. 4',
    netQuantity: '100 g',
    visibleIdentifier: 'HSM-449',
    packagingIdentifier: 'Monocarton box with inner pouch',
    identityConfidence: 'HIGH',
    consistencyScore: 40,
    isConsistent: true,
    matchAssessment: 'Carton panels match product identity, but conflicting MRP values detected.',
    categoryDetermined: false,
    productCategory: null
  };

  const eval3 = evaluateComplianceRules(demo3Declarations, demo3Identity, demo1RawTexts);

  const session3: ScanSession = {
    scanId: 'SCN-2026-0003',
    sessionId: 'sess_demo_3',
    userId: defaultUserId,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'COMPLETED',
    images: {
      front: {
        id: 'img_spice_f',
        side: 'front',
        previewUrl: createPackageSvgDataUrl('HERITAGE SPICE - Front (MRP ₹95)', 'front', ['HERITAGE SPICE', 'Special Garam Masala', 'Printed MRP: ₹ 95.00', 'Net Qty: 100 g'], '#EF4444'),
        quality: { status: 'GOOD', resolution: 'High', blurScore: 10, lighting: 'GOOD', textReadability: 'CLEAR', issues: [] },
        uploadedAt: now,
        fileName: 'spice_front.jpg'
      },
      back: {
        id: 'img_spice_b',
        side: 'back',
        previewUrl: createPackageSvgDataUrl('HERITAGE SPICE - Back Sticker (MRP ₹110)', 'back', ['OVERPRINTED STICKER DETECTED', 'Sticker MRP: ₹ 110.00 (incl. of all taxes)', 'CONFLICT WITH FRONT ₹95.00'], '#EF4444'),
        quality: { status: 'GOOD', resolution: 'High', blurScore: 11, lighting: 'GOOD', textReadability: 'CLEAR', issues: [] },
        uploadedAt: now,
        fileName: 'spice_back.jpg'
      },
      upper: null,
      lower: null
    },
    productIdentity: demo3Identity,
    rawExtractedText: demo1RawTexts,
    extractedDeclarations: demo3Declarations,
    ruleResults: eval3.ruleResults,
    screeningScore: eval3.screeningScore,
    evidenceList: [],
    auditTrail: [
      { id: 'aud_d3_1', timestamp: now, user: 'RULE_ENGINE', action: 'MRP_INCONSISTENCY_FLAGGED', details: 'Rule 18(1) violation: dual pricing detected between carton face and back sticker' }
    ],
    isDemo: true,
    demoLabel: 'DEMO DATA: CONFLICTING MRP EXAMPLE'
  };

  // 4. POOR IMAGE / BLUR QUALITY EXAMPLE
  const demo4Declarations = JSON.parse(JSON.stringify(demo1Declarations));
  demo4Declarations.brand_name.value = 'FARM FRESH';
  demo4Declarations.product_name.value = 'Rolled Oats';
  demo4Declarations.mrp.status = 'UNCERTAIN';
  demo4Declarations.mrp.value = 'Unreadable due to motion blur';

  const demo4Identity: ProductIdentity = {
    brand: 'FARM FRESH',
    productName: 'Rolled Oats',
    variant: 'Gluten Free Rolled',
    netQuantity: '1 kg',
    visibleIdentifier: 'OATS-992',
    packagingIdentifier: 'Kraft paper pouch',
    identityConfidence: 'MEDIUM',
    consistencyScore: 75,
    isConsistent: true,
    matchAssessment: 'Product shape and color match, but lower panels suffer severe blur.',
    categoryDetermined: false,
    productCategory: null
  };

  const demo4RawTexts = JSON.parse(JSON.stringify(demo1RawTexts));
  demo4RawTexts.back.readabilityAssessment = 'NOT_READABLE';

  const eval4 = evaluateComplianceRules(demo4Declarations, demo4Identity, demo4RawTexts);

  const session4: ScanSession = {
    scanId: 'SCN-2026-0004',
    sessionId: 'sess_demo_4',
    userId: defaultUserId,
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    status: 'COMPLETED',
    images: {
      front: {
        id: 'img_oats_f',
        side: 'front',
        previewUrl: createPackageSvgDataUrl('FARM FRESH - Rolled Oats Front', 'front', ['FARM FRESH OATS', '100% Whole Grain', 'Net Wt: 1 kg'], '#3B82F6'),
        quality: { status: 'GOOD', resolution: 'High', blurScore: 15, lighting: 'GOOD', textReadability: 'CLEAR', issues: [] },
        uploadedAt: now,
        fileName: 'oats_front.jpg'
      },
      back: {
        id: 'img_oats_b',
        side: 'back',
        previewUrl: createPackageSvgDataUrl('FARM FRESH - Blurry Back Image', 'back', ['[BLURRED FINE PRINT]', '[GLARE ON MRP REGION]', 'Text illegible due to camera motion blur'], '#EF4444', '#271010'),
        quality: {
          status: 'POOR',
          resolution: 'Low (480p)',
          blurScore: 82,
          lighting: 'GLARE',
          textReadability: 'POOR',
          issues: ['High motion blur detected on fine text lines', 'Glare reflection on MRP region'],
          recommendation: 'Retake photo under diffused lighting with steady hands.'
        },
        uploadedAt: now,
        fileName: 'oats_back_blurry.jpg'
      },
      upper: null,
      lower: null
    },
    productIdentity: demo4Identity,
    rawExtractedText: demo4RawTexts,
    extractedDeclarations: demo4Declarations,
    ruleResults: eval4.ruleResults,
    screeningScore: eval4.screeningScore,
    evidenceList: [],
    auditTrail: [
      { id: 'aud_d4_1', timestamp: now, user: 'QUALITY_CHECK', action: 'IMAGE_QUALITY_FLAGGED', details: 'Back image marked POOR (blurScore: 82). Inspector chose to continue anyway.' }
    ],
    isDemo: true,
    demoLabel: 'DEMO DATA: POOR IMAGE QUALITY EXAMPLE'
  };

  // 5. MULTI-IMAGE MISMATCH DETECTED EXAMPLE
  const demo5Declarations = JSON.parse(JSON.stringify(demo1Declarations));
  demo5Declarations.brand_name.value = 'MIXED (Britannia / Parle)';
  demo5Declarations.product_name.value = 'Inconsistent (Good Day Cookies / Parle-G)';
  demo5Declarations.net_quantity.value = '120g (Front) vs 800g (Back)';

  const demo5Identity: ProductIdentity = {
    brand: 'INCONSISTENT / MISMATCH',
    productName: 'Possible Image Mismatch Detected',
    variant: null,
    netQuantity: 'Conflicting values',
    visibleIdentifier: 'Mismatch',
    packagingIdentifier: 'Mixed materials',
    identityConfidence: 'LOW',
    consistencyScore: 20,
    isConsistent: false,
    matchAssessment: 'CRITICAL MISMATCH: Front image shows Britannia Good Day Cookies, while Back image shows Parle-G Glucose Biscuits.',
    mismatchDetails: 'Front image has brand Britannia with yellow corrugated biscuit pack; Back image has Parle Products with white/red glucose biscuit layout. They belong to two different commercial packages.',
    categoryDetermined: false,
    productCategory: null
  };

  const eval5 = evaluateComplianceRules(demo5Declarations, demo5Identity, demo1RawTexts);

  const session5: ScanSession = {
    scanId: 'SCN-2026-0005',
    sessionId: 'sess_demo_5',
    userId: defaultUserId,
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    status: 'MISMATCH_DETECTED',
    images: {
      front: {
        id: 'img_mismatch_f',
        side: 'front',
        previewUrl: createPackageSvgDataUrl('BRITANNIA GOOD DAY (Front Slot)', 'front', ['BRITANNIA GOOD DAY', 'Cashew Cookies', 'Net Wt: 120 g'], '#EF4444'),
        quality: { status: 'GOOD', resolution: 'High', blurScore: 12, lighting: 'GOOD', textReadability: 'CLEAR', issues: [] },
        uploadedAt: now,
        fileName: 'good_day_front.jpg'
      },
      back: {
        id: 'img_mismatch_b',
        side: 'back',
        previewUrl: createPackageSvgDataUrl('PARLE-G BISCUITS (Back Slot - Mismatch!)', 'back', ['PARLE-G GLUCOSE BISCUITS', 'Mfd by: Parle Products Pvt Ltd', 'DIFFERENT PRODUCT DETECTED'], '#EF4444'),
        quality: { status: 'GOOD', resolution: 'High', blurScore: 14, lighting: 'GOOD', textReadability: 'CLEAR', issues: [] },
        uploadedAt: now,
        fileName: 'parle_g_back.jpg'
      },
      upper: null,
      lower: null
    },
    productIdentity: demo5Identity,
    rawExtractedText: demo1RawTexts,
    extractedDeclarations: demo5Declarations,
    ruleResults: eval5.ruleResults,
    screeningScore: eval5.screeningScore,
    evidenceList: [],
    auditTrail: [
      { id: 'aud_d5_1', timestamp: now, user: 'RECONCILIATION_ENGINE', action: 'PRODUCT_MISMATCH_HALT', details: 'Cross-image consistency check detected 2 distinct products across slots' }
    ],
    isDemo: true,
    demoLabel: 'DEMO DATA: MULTI-IMAGE MISMATCH EXAMPLE'
  };

  return [session1, session2, session3, session4, session5];
}

export function computeDashboardMetrics(sessions: ScanSession[]): DashboardMetrics {
  const total = sessions.length;
  let violations = 0;
  let reviews = 0;
  let compliant = 0;

  const categoryMap: Record<string, number> = {
    'Mandatory Declarations': 0,
    'MRP & Taxation': 0,
    'Consumer Care Redressal': 0,
    'Net Quantity Adherence': 0,
    'Date & Shelf Life': 0,
    'Legibility & Contrast': 0
  };

  const missingMap: Record<string, number> = {};

  for (const s of sessions) {
    if (s.screeningScore.status === 'POTENTIAL NON-COMPLIANCE') {
      violations++;
    } else if (s.screeningScore.status === 'REVIEW REQUIRED') {
      reviews++;
    } else {
      compliant++;
    }

    // Check failed rules
    for (const r of s.ruleResults) {
      if (r.status === 'FAIL') {
        if (r.ruleId.includes('MRP')) categoryMap['MRP & Taxation']++;
        else if (r.ruleId.includes('CONSUMER')) categoryMap['Consumer Care Redressal']++;
        else if (r.ruleId.includes('QUANTITY')) categoryMap['Net Quantity Adherence']++;
        else if (r.ruleId.includes('DATE')) categoryMap['Date & Shelf Life']++;
        else if (r.ruleId.includes('READABILITY')) categoryMap['Legibility & Contrast']++;
        else categoryMap['Mandatory Declarations']++;
      }
    }

    // Check missing declarations
    for (const key of Object.keys(s.extractedDeclarations)) {
      const dec = (s.extractedDeclarations as any)[key];
      if (dec && dec.status === 'NOT_DETECTED') {
        missingMap[dec.label] = (missingMap[dec.label] || 0) + 1;
      }
    }
  }

  const totalViolationsRecorded = Math.max(1, Object.values(categoryMap).reduce((a, b) => a + b, 0));
  const violationsByCategory = Object.entries(categoryMap).map(([category, count]) => ({
    category,
    count,
    percentage: Math.round((count / totalViolationsRecorded) * 100)
  }));

  const commonMissingDeclarations = Object.entries(missingMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([field, count]) => ({ field, count }));

  // Recent 5-day trend
  const recentTrend = [
    { date: 'Day -4', inspections: 2, violations: 1 },
    { date: 'Day -3', inspections: 3, violations: 1 },
    { date: 'Day -2', inspections: 4, violations: 2 },
    { date: 'Yesterday', inspections: 3, violations: 1 },
    { date: 'Today', inspections: total, violations }
  ];

  return {
    totalInspections: total,
    potentialViolations: violations,
    reviewRequired: reviews,
    compliantCount: compliant,
    violationsByCategory,
    recentTrend,
    commonMissingDeclarations
  };
}
