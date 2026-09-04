export type SideType = 'front' | 'back' | 'upper' | 'lower';

export type QualityStatus = 'GOOD' | 'WARNING' | 'POOR';

export interface ImageQualityAssessment {
  status: QualityStatus;
  resolution: string;
  blurScore: number; // 0 (crisp) to 100 (unreadable)
  lighting: 'GOOD' | 'LOW' | 'OVEREXPOSED' | 'GLARE';
  textReadability: 'CLEAR' | 'PARTIAL' | 'DIFFICULT' | 'POOR';
  issues: string[];
  recommendation?: string;
}

export interface BoundingBox {
  ymin: number; // 0 - 1000 scale
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface TextRegion {
  id: string;
  text: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  boundingBox?: BoundingBox;
  orientation?: number;
  side: SideType;
}

export interface RawExtractedImageText {
  imageId: string;
  side: SideType;
  rawText: string;
  normalizedText?: string;
  textRegions: TextRegion[];
  detectedLanguage?: string;
  readabilityAssessment: 'READABLE' | 'POTENTIALLY_DIFFICULT' | 'NOT_READABLE' | 'MANUAL_VERIFICATION_REQUIRED';
}

export type DeclarationStatus = 
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'UNCERTAIN'
  | 'NOT_APPLICABLE'
  | 'MANUAL_REVIEW';

export interface DeclarationEvidence {
  imageId?: string;
  side: SideType;
  boundingBox?: BoundingBox;
  textSnippet: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DeclarationEditLog {
  editor: string;
  timestamp: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
}

export interface DeclarationField {
  key: string;
  label: string;
  value: string | null;
  status: DeclarationStatus;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceImage: SideType | null;
  evidence: DeclarationEvidence | null;
  isEdited?: boolean;
  originalValue?: string | null;
  editHistory?: DeclarationEditLog[];
  categoryNotes?: string;
  inconsistencyFlag?: boolean;
  alternativeValues?: { side: SideType; value: string }[];
}

export interface ExtractedDeclarations {
  product_name: DeclarationField;
  brand_name: DeclarationField;
  variant: DeclarationField;
  manufacturer: DeclarationField;
  packer: DeclarationField;
  importer: DeclarationField;
  manufacturer_address: DeclarationField;
  packer_address: DeclarationField;
  importer_address: DeclarationField;
  net_quantity: DeclarationField;
  mrp: DeclarationField;
  manufacturing_or_packing_date: DeclarationField;
  best_before_or_expiry: DeclarationField;
  import_date: DeclarationField;
  consumer_care_details: DeclarationField;
  country_of_origin: DeclarationField;
  unit_sale_price?: DeclarationField;
  other_declarations: DeclarationField[];
}

export interface ProductIdentity {
  brand: string | null;
  productName: string | null;
  variant: string | null;
  netQuantity: string | null;
  visibleIdentifier: string | null;
  packagingIdentifier: string | null;
  identityConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  identityBasis?: string; // e.g. "Product identity derived from visible package text."
  consistencyScore: number; // 0 - 100
  isConsistent: boolean;
  matchAssessment: string;
  mismatchDetails?: string;
  potentialMismatchFlag?: boolean;
  categoryDetermined: boolean;
  productCategory: string | null; // Null unless explicitly verified
}

export type RuleSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR';

export type RuleResultStatus = 
  | 'PASS'
  | 'FAIL'
  | 'REVIEW_REQUIRED'
  | 'NOT_DETERMINABLE'
  | 'NOT_APPLICABLE';

export interface ComplianceRule {
  id: string;
  name: string;
  legalReference: string; // e.g., "Rule 6(1)(a)"
  description: string;
  requirement: string;
  severity: RuleSeverity;
  enabled: boolean;
  version: string;
  category: 'MANDATORY' | 'QUANTITY' | 'MRP' | 'DATE' | 'CONSUMER_CARE' | 'MANUFACTURER' | 'ORIGIN' | 'READABILITY' | 'FONT_SIZE' | 'PLACEMENT';
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  legalReference: string;
  status: RuleResultStatus;
  severity: RuleSeverity;
  reason: string;
  explanation?: string;
  detectedDetails: string;
  missingDetails?: string;
  detectedElements?: string[];
  missingElements?: string[];
  evidence: DeclarationEvidence[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedAction: string;
}

export interface ScreeningScore {
  overall: number; // 0 - 100
  mandatoryScore: number;
  readabilityScore: number;
  consistencyScore: number;
  evidenceQualityScore: number;
  status: 'PASS' | 'REVIEW REQUIRED' | 'POTENTIAL NON-COMPLIANCE';
  disclaimer: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface ScanImage {
  id: string;
  side: SideType;
  previewUrl: string; // base64 or served URL
  quality: ImageQualityAssessment;
  uploadedAt: string;
  fileSizeKb?: number;
  fileName?: string;
}

export interface DebugPipelineStep {
  name: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'SKIPPED';
  details: string;
  timestamp?: string;
  durationMs?: number;
}

export type InspectionStatus =
  | 'DRAFT'
  | 'SCANNING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'REVIEW_REQUIRED'
  | 'HUMAN_REVIEW_REQUESTED'
  | 'REVIEWED'
  | 'MISMATCH_DETECTED'
  | 'FAILED';

export interface HumanReviewData {
  requestedBy: string;
  requestedAt: string;
  reason: string;
  note?: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  reviewerName?: string;
  reviewedAt?: string;
  reviewerDecision?: 'CONFIRMED' | 'CORRECTED' | 'REJECTED';
  observations?: string;
  corrections?: Record<
    string,
    {
      aiValue: string | null;
      reviewedValue: string;
      reason: string;
      timestamp: string;
      reviewer: string;
    }
  >;
}

export interface ScanSession {
  scanId: string;
  sessionId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: InspectionStatus;
  images: Record<SideType, ScanImage | null>;
  productIdentity: ProductIdentity;
  rawExtractedText: Record<SideType, RawExtractedImageText | null>;
  extractedDeclarations: ExtractedDeclarations;
  ruleResults: RuleEvaluationResult[];
  screeningScore: ScreeningScore;
  evidenceList: DeclarationEvidence[];
  auditTrail: AuditEntry[];
  humanReview?: HumanReviewData;
  debugAnalysis?: {
    steps: DebugPipelineStep[];
    availablePanels: SideType[];
    summary: string;
    stageTimings?: Record<string, number>;
  };
  inspectorAssessment?: {
    assessedBy: string;
    assessedAt: string;
    decision: 'ACCEPT' | 'REJECT' | 'ESCALATE_FOR_LEGAL_HEARING';
    notes: string;
  };
  isDemo?: boolean;
  demoLabel?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  mobileNumber?: string;
  email?: string;
  role: 'INSPECTOR' | 'SUPERVISOR' | 'GUEST' | 'USER';
  organization?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalInspections: number;
  potentialViolations: number;
  reviewRequired: number;
  compliantCount: number;
  violationsByCategory: { category: string; count: number; percentage: number }[];
  recentTrend: { date: string; inspections: number; violations: number }[];
  commonMissingDeclarations: { field: string; count: number }[];
}
