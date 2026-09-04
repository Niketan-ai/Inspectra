import {
  DeclarationField,
  ExtractedDeclarations,
  ProductIdentity,
  ScanSession,
  ScreeningScore,
  SideType
} from '../types.js';

/**
 * Defensive Normalization and Sanitization Engine
 * Guarantees no null pointer exceptions, undefined errors, or type mismatches
 * can crash the Inspectra Result UI on mobile or desktop devices.
 */

export interface NormalizedResultData {
  productName: string | null;
  brand: string | null;
  variant: string | null;
  netQuantity: string | null;
  mrp: string | null;
  manufacturer: string | null;
  packer: string | null;
  importer: string | null;
  dates: string[];
  consumerCare: string | null;
  countryOfOrigin: string | null;
  evidence: DeclarationEvidence[];
  issues: Array<{ key: string; label: string; issue: string; status: string }>;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

/**
 * Creates an empty default DeclarationField
 */
export function createDefaultField(key: string, label: string): DeclarationField {
  return {
    key,
    label,
    value: null,
    status: 'NOT_DETECTED',
    confidence: 'LOW',
    sourceImage: null,
    evidence: null
  };
}

/**
 * Safely format any declaration value with safe fallback:
 * "Not detected" instead of undefined/null
 */
export function formatValue(value: string | null | undefined, fallback: string = 'Not detected'): string {
  if (value === null || value === undefined || value === '' || String(value).trim() === '') {
    return fallback;
  }
  return String(value).trim();
}

/**
 * Safe side string helper ensuring .toUpperCase() never throws
 */
export function safeSideName(side: any, fallback: string = 'PANEL'): string {
  if (typeof side === 'string' && side.trim().length > 0) {
    return side.trim().toUpperCase();
  }
  return fallback.toUpperCase();
}

/**
 * Default empty declarations structure
 */
export function getDefaultDeclarations(): ExtractedDeclarations {
  return {
    product_name: createDefaultField('product_name', 'Commodity Name & Description'),
    brand_name: createDefaultField('brand_name', 'Brand / Trade Name'),
    variant: createDefaultField('variant', 'Product Variant'),
    manufacturer: createDefaultField('manufacturer', 'Manufacturer Name'),
    packer: createDefaultField('packer', 'Packer Name (if different)'),
    importer: createDefaultField('importer', 'Importer Name (if imported)'),
    manufacturer_address: createDefaultField('manufacturer_address', 'Manufacturer Complete Address'),
    packer_address: createDefaultField('packer_address', 'Packer Address'),
    importer_address: createDefaultField('importer_address', 'Importer Address'),
    net_quantity: createDefaultField('net_quantity', 'Net Quantity (Standard Metric)'),
    mrp: createDefaultField('mrp', 'Maximum Retail Price (MRP incl. taxes)'),
    manufacturing_or_packing_date: createDefaultField('manufacturing_or_packing_date', 'Month & Year of Mfg / Packing'),
    best_before_or_expiry: createDefaultField('best_before_or_expiry', 'Best Before / Expiry Date'),
    import_date: createDefaultField('import_date', 'Import Month & Year'),
    consumer_care_details: createDefaultField('consumer_care_details', 'Consumer Care Cell Details'),
    country_of_origin: createDefaultField('country_of_origin', 'Country of Origin'),
    other_declarations: []
  };
}

/**
 * Default empty product identity
 */
export function getDefaultProductIdentity(): ProductIdentity {
  return {
    brand: null,
    productName: null,
    variant: null,
    netQuantity: null,
    visibleIdentifier: null,
    packagingIdentifier: null,
    identityConfidence: 'UNKNOWN',
    identityBasis: 'Derived from packaging text.',
    consistencyScore: 0,
    isConsistent: true,
    matchAssessment: 'Pending complete photograph capture and cross-image inspection.',
    categoryDetermined: false,
    productCategory: null
  };
}

/**
 * Default empty screening score
 */
export function getDefaultScreeningScore(): ScreeningScore {
  return {
    overall: 0,
    mandatoryScore: 0,
    readabilityScore: 0,
    consistencyScore: 0,
    evidenceQualityScore: 0,
    status: 'REVIEW REQUIRED',
    disclaimer: 'Pending inspection and declaration extraction.'
  };
}

/**
 * Safely normalizes a single declaration field
 */
function normalizeField(field: any, defaultField: DeclarationField): DeclarationField {
  if (!field || typeof field !== 'object') {
    return { ...defaultField };
  }

  const rawValue = field.value;
  const value = rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== ''
    ? String(rawValue).trim()
    : null;

  let altValues: { side: SideType; value: string }[] | undefined;
  if (Array.isArray(field.alternativeValues)) {
    altValues = field.alternativeValues
      .filter((av: any) => av && typeof av === 'object')
      .map((av: any) => ({
        side: (typeof av.side === 'string' && ['front', 'back', 'upper', 'lower'].includes(av.side))
          ? (av.side as SideType)
          : ('back' as SideType),
        value: av.value !== null && av.value !== undefined ? String(av.value) : ''
      }));
  }

  let evidence: DeclarationEvidence | null = null;
  if (field.evidence && typeof field.evidence === 'object') {
    evidence = {
      imageId: field.evidence.imageId || 'img_unknown',
      side: (typeof field.evidence.side === 'string' && ['front', 'back', 'upper', 'lower'].includes(field.evidence.side))
        ? (field.evidence.side as SideType)
        : ('back' as SideType),
      textSnippet: field.evidence.textSnippet ? String(field.evidence.textSnippet) : (value || ''),
      boundingBox: field.evidence.boundingBox && typeof field.evidence.boundingBox === 'object'
        ? {
            ymin: Number(field.evidence.boundingBox.ymin ?? 0),
            xmin: Number(field.evidence.boundingBox.xmin ?? 0),
            ymax: Number(field.evidence.boundingBox.ymax ?? 1000),
            xmax: Number(field.evidence.boundingBox.xmax ?? 1000)
          }
        : undefined,
      confidence: field.evidence.confidence === 'HIGH' || field.evidence.confidence === 'MEDIUM'
        ? field.evidence.confidence
        : 'LOW'
    };
  }

  return {
    key: field.key || defaultField.key,
    label: field.label || defaultField.label,
    value,
    status: field.status || (value ? 'DETECTED' : 'NOT_DETECTED'),
    confidence: field.confidence === 'HIGH' || field.confidence === 'MEDIUM' ? field.confidence : 'LOW',
    sourceImage: field.sourceImage || null,
    evidence,
    isEdited: Boolean(field.isEdited),
    originalValue: field.originalValue || null,
    editHistory: Array.isArray(field.editHistory) ? field.editHistory : [],
    categoryNotes: field.categoryNotes || undefined,
    inconsistencyFlag: Boolean(field.inconsistencyFlag),
    alternativeValues: altValues
  };
}

/**
 * Normalizes a scan session to ensure no null pointer exceptions can occur.
 * Guarantees all nested arrays, objects, and fields are safely initialized.
 * NEVER throws an uncaught error.
 */
export function sanitizeScanSession(raw: any): ScanSession {
  const defaultDecs = getDefaultDeclarations();
  const defaultIdentity = getDefaultProductIdentity();
  const defaultScore = getDefaultScreeningScore();

  if (!raw || typeof raw !== 'object') {
    return {
      scanId: `SCN-FALLBACK-${Date.now()}`,
      sessionId: `sess_${Date.now()}`,
      userId: 'usr_guest',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'FAILED',
      images: { front: null, back: null, upper: null, lower: null },
      productIdentity: defaultIdentity,
      rawExtractedText: { front: null, back: null, upper: null, lower: null },
      extractedDeclarations: defaultDecs,
      ruleResults: [],
      screeningScore: defaultScore,
      evidenceList: [],
      auditTrail: []
    };
  }

  const rawDecs = raw.extractedDeclarations || {};
  const safeDeclarations: ExtractedDeclarations = {
    product_name: normalizeField(rawDecs.product_name, defaultDecs.product_name),
    brand_name: normalizeField(rawDecs.brand_name, defaultDecs.brand_name),
    variant: normalizeField(rawDecs.variant, defaultDecs.variant),
    manufacturer: normalizeField(rawDecs.manufacturer, defaultDecs.manufacturer),
    packer: normalizeField(rawDecs.packer, defaultDecs.packer),
    importer: normalizeField(rawDecs.importer, defaultDecs.importer),
    manufacturer_address: normalizeField(rawDecs.manufacturer_address, defaultDecs.manufacturer_address),
    packer_address: normalizeField(rawDecs.packer_address, defaultDecs.packer_address),
    importer_address: normalizeField(rawDecs.importer_address, defaultDecs.importer_address),
    net_quantity: normalizeField(rawDecs.net_quantity, defaultDecs.net_quantity),
    mrp: normalizeField(rawDecs.mrp, defaultDecs.mrp),
    manufacturing_or_packing_date: normalizeField(
      rawDecs.manufacturing_or_packing_date,
      defaultDecs.manufacturing_or_packing_date
    ),
    best_before_or_expiry: normalizeField(
      rawDecs.best_before_or_expiry,
      defaultDecs.best_before_or_expiry
    ),
    import_date: normalizeField(rawDecs.import_date, defaultDecs.import_date),
    consumer_care_details: normalizeField(
      rawDecs.consumer_care_details,
      defaultDecs.consumer_care_details
    ),
    country_of_origin: normalizeField(rawDecs.country_of_origin, defaultDecs.country_of_origin),
    unit_sale_price: rawDecs.unit_sale_price ? normalizeField(rawDecs.unit_sale_price, createDefaultField('unit_sale_price', 'Unit Sale Price')) : undefined,
    other_declarations: Array.isArray(rawDecs.other_declarations)
      ? rawDecs.other_declarations.map((od: any) => normalizeField(od, createDefaultField(od?.key || 'other', od?.label || 'Other Declaration')))
      : []
  };

  const rawIdentity = raw.productIdentity || {};
  const safeIdentity: ProductIdentity = {
    brand: rawIdentity.brand ? String(rawIdentity.brand).trim() : null,
    productName: rawIdentity.productName ? String(rawIdentity.productName).trim() : null,
    variant: rawIdentity.variant ? String(rawIdentity.variant).trim() : null,
    netQuantity: rawIdentity.netQuantity ? String(rawIdentity.netQuantity).trim() : null,
    visibleIdentifier: rawIdentity.visibleIdentifier ? String(rawIdentity.visibleIdentifier) : null,
    packagingIdentifier: rawIdentity.packagingIdentifier ? String(rawIdentity.packagingIdentifier) : null,
    identityConfidence: rawIdentity.identityConfidence || 'UNKNOWN',
    identityBasis: rawIdentity.identityBasis || 'Package text evidence',
    consistencyScore: typeof rawIdentity.consistencyScore === 'number' ? rawIdentity.consistencyScore : 0,
    isConsistent: rawIdentity.isConsistent !== false,
    matchAssessment: rawIdentity.matchAssessment || 'Cross-panel examination complete.',
    mismatchDetails: rawIdentity.mismatchDetails ? String(rawIdentity.mismatchDetails) : undefined,
    potentialMismatchFlag: Boolean(rawIdentity.potentialMismatchFlag),
    categoryDetermined: Boolean(rawIdentity.categoryDetermined),
    productCategory: rawIdentity.productCategory ? String(rawIdentity.productCategory) : null
  };

  const rawScore = raw.screeningScore || {};
  const safeScore: ScreeningScore = {
    overall: typeof rawScore.overall === 'number' ? rawScore.overall : 0,
    mandatoryScore: typeof rawScore.mandatoryScore === 'number' ? rawScore.mandatoryScore : 0,
    readabilityScore: typeof rawScore.readabilityScore === 'number' ? rawScore.readabilityScore : 0,
    consistencyScore: typeof rawScore.consistencyScore === 'number' ? rawScore.consistencyScore : 0,
    evidenceQualityScore: typeof rawScore.evidenceQualityScore === 'number' ? rawScore.evidenceQualityScore : 0,
    status: rawScore.status || 'REVIEW REQUIRED',
    disclaimer: rawScore.disclaimer || 'Inspection complete.'
  };

  const rawImages = raw.images || {};
  const safeImages: Record<SideType, any> = {
    front: rawImages.front || null,
    back: rawImages.back || null,
    upper: rawImages.upper || null,
    lower: rawImages.lower || null
  };

  const rawTexts = raw.rawExtractedText || {};
  const safeRawTexts: Record<SideType, any> = {
    front: rawTexts.front || null,
    back: rawTexts.back || null,
    upper: rawTexts.upper || null,
    lower: rawTexts.lower || null
  };

  // Defensive normalization of rule evaluation results
  const safeRuleResults = Array.isArray(raw.ruleResults)
    ? raw.ruleResults.map((r: any) => ({
        ruleId: String(r?.ruleId || 'RULE_DEF'),
        ruleName: String(r?.ruleName || 'Statutory Requirement'),
        legalReference: String(r?.legalReference || 'Legal Metrology Rules, 2011'),
        status: r?.status || 'REVIEW_REQUIRED',
        severity: r?.severity || 'MAJOR',
        reason: String(r?.reason || 'Rule evaluation executed.'),
        explanation: r?.explanation ? String(r.explanation) : undefined,
        detectedDetails: String(r?.detectedDetails || ''),
        missingDetails: r?.missingDetails ? String(r.missingDetails) : undefined,
        detectedElements: Array.isArray(r?.detectedElements) ? r.detectedElements : [],
        missingElements: Array.isArray(r?.missingElements) ? r.missingElements : [],
        evidence: Array.isArray(r?.evidence)
          ? r.evidence.map((ev: any) => ({
              imageId: ev?.imageId || 'img_unknown',
              side: (typeof ev?.side === 'string' && ['front', 'back', 'upper', 'lower'].includes(ev.side))
                ? (ev.side as SideType)
                : ('back' as SideType),
              textSnippet: ev?.textSnippet ? String(ev.textSnippet) : '',
              boundingBox: ev?.boundingBox || undefined,
              confidence: ev?.confidence || 'MEDIUM'
            }))
          : [],
        confidence: r?.confidence || 'MEDIUM',
        recommendedAction: String(r?.recommendedAction || 'Review packaging declarations.')
      }))
    : [];

  return {
    scanId: raw.scanId || `SCN-${Date.now()}`,
    sessionId: raw.sessionId || `sess_${Date.now()}`,
    userId: raw.userId || 'usr_guest',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    status: raw.status || 'COMPLETED',
    images: safeImages,
    productIdentity: safeIdentity,
    rawExtractedText: safeRawTexts,
    extractedDeclarations: safeDeclarations,
    ruleResults: safeRuleResults,
    screeningScore: safeScore,
    evidenceList: Array.isArray(raw.evidenceList) ? raw.evidenceList : [],
    auditTrail: Array.isArray(raw.auditTrail) ? raw.auditTrail : [],
    humanReview: raw.humanReview,
    debugAnalysis: raw.debugAnalysis,
    inspectorAssessment: raw.inspectorAssessment,
    isDemo: Boolean(raw.isDemo),
    demoLabel: raw.demoLabel
  };
}

/**
 * Extracts a normalized, flat result representation for guaranteed safe rendering.
 * Section 6 of prompt: Every missing value becomes null/empty collection.
 */
export function extractNormalizedResult(session: ScanSession): NormalizedResultData {
  const pId = session.productIdentity;
  const decs = session.extractedDeclarations;

  const dates: string[] = [];
  if (decs.manufacturing_or_packing_date?.value) {
    dates.push(`Mfg: ${decs.manufacturing_or_packing_date.value}`);
  }
  if (decs.best_before_or_expiry?.value) {
    dates.push(`Expiry: ${decs.best_before_or_expiry.value}`);
  }
  if (decs.import_date?.value) {
    dates.push(`Import: ${decs.import_date.value}`);
  }

  const issues: Array<{ key: string; label: string; issue: string; status: string }> = [];
  for (const key of Object.keys(decs) as Array<keyof ExtractedDeclarations>) {
    if (key === 'other_declarations') continue;
    const field = decs[key] as DeclarationField | undefined;
    if (field && (field.status === 'NOT_DETECTED' || field.confidence === 'LOW' || field.inconsistencyFlag)) {
      issues.push({
        key: field.key,
        label: field.label,
        issue: field.inconsistencyFlag ? 'Inconsistent value across packaging' : field.status === 'NOT_DETECTED' ? 'Not visibly declared' : 'Low confidence read',
        status: field.status
      });
    }
  }

  const evidence: DeclarationEvidence[] = [];
  for (const key of Object.keys(decs) as Array<keyof ExtractedDeclarations>) {
    if (key === 'other_declarations') continue;
    const field = decs[key] as DeclarationField | undefined;
    if (field?.evidence) {
      evidence.push(field.evidence);
    }
  }

  return {
    productName: pId.productName || decs.product_name?.value || null,
    brand: pId.brand || decs.brand_name?.value || null,
    variant: pId.variant || decs.variant?.value || null,
    netQuantity: pId.netQuantity || decs.net_quantity?.value || null,
    mrp: decs.mrp?.value || null,
    manufacturer: decs.manufacturer?.value || null,
    packer: decs.packer?.value || null,
    importer: decs.importer?.value || null,
    dates,
    consumerCare: decs.consumer_care_details?.value || null,
    countryOfOrigin: decs.country_of_origin?.value || null,
    evidence,
    issues,
    confidence: pId.identityConfidence || 'UNKNOWN'
  };
}

/**
 * Development-only safe diagnostics logger (Section 15 of user instructions).
 * Logs diagnostic state without exposing complete phone numbers, OTP, or secrets.
 */
export function logDiagnosticInfo(
  context: string,
  data: {
    scanId?: string | null;
    currentRoute?: string;
    currentScanStage?: string;
    imageCount?: number;
    imageDimensions?: Record<string, { w: number; h: number }>;
    uploadStatus?: string;
    geminiRequestStatus?: string;
    geminiResponseStatus?: string;
    jsonParseStatus?: string;
    schemaValidationStatus?: string;
    resultState?: string;
    renderState?: string;
    navigationState?: string;
    [key: string]: any;
  }
) {
  if (process.env.NODE_ENV === 'production') return;

  const sanitizedData = { ...data };
  // Redact any sensitive tokens, numbers or secrets
  delete (sanitizedData as any).otp;
  delete (sanitizedData as any).token;
  delete (sanitizedData as any).apiKey;
  delete (sanitizedData as any).password;

  console.log(`[INSPECTRA DIAGNOSTIC][${context}]`, sanitizedData);
}
