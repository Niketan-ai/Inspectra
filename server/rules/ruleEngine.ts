import {
  ComplianceRule,
  ExtractedDeclarations,
  ProductIdentity,
  RawExtractedImageText,
  RuleEvaluationResult,
  ScreeningScore,
  SideType
} from '../../src/types.js';
import { DEFAULT_RULES } from './ruleRegistry.js';

export function evaluateComplianceRules(
  declarations: ExtractedDeclarations,
  productIdentity: ProductIdentity,
  rawTexts: Record<SideType, RawExtractedImageText | null>,
  activeRules: ComplianceRule[] = DEFAULT_RULES
): { ruleResults: RuleEvaluationResult[]; screeningScore: ScreeningScore } {
  const results: RuleEvaluationResult[] = [];

  for (const rule of activeRules) {
    if (!rule.enabled) continue;

    switch (rule.id) {
      case 'RULE_6_1_A_PRODUCT_NAME': {
        const field = declarations.product_name;
        if (field.status === 'DETECTED' && field.value && field.value.trim().length > 1) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'PASS',
            severity: rule.severity,
            reason: 'Commodity name or identity is clearly declared on package.',
            detectedDetails: `Detected Name: "${field.value}"`,
            evidence: field.evidence ? [field.evidence] : [],
            confidence: field.confidence,
            recommendedAction: 'No immediate action needed. Verify alignment with trade description.'
          });
        } else if (field.status === 'UNCERTAIN') {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'REVIEW_REQUIRED',
            severity: rule.severity,
            reason: 'Product name or trade description is ambiguous or partially obscured.',
            detectedDetails: field.value ? `Partial text: "${field.value}"` : 'No definitive name string detected',
            missingDetails: 'Unambiguous generic or specific commodity name',
            evidence: field.evidence ? [field.evidence] : [],
            confidence: 'LOW',
            recommendedAction: 'Manual verification required to confirm official product name.'
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'FAIL',
            severity: rule.severity,
            reason: 'Potential non-compliance: Commodity name was not detected on any visible package surface.',
            detectedDetails: 'No commodity name detected across scanned surfaces.',
            missingDetails: 'Mandatory commodity identity under Rule 6(1)(a)',
            evidence: [],
            confidence: 'HIGH',
            recommendedAction: 'Manual verification required. Check if name is printed on uncaptured side.'
          });
        }
        break;
      }

      case 'RULE_6_1_B_NET_QUANTITY': {
        const field = declarations.net_quantity;
        const validUnitsRegex = /(\b\d+(?:\.\d+)?\s*(?:kg|g|gm|gms|grams|l|ml|m|cm|mm|n|units|pcs|pieces)\b)/i;
        
        if (field.status === 'DETECTED' && field.value) {
          const hasValidUnit = validUnitsRegex.test(field.value);
          const hasInvalidQualifier = /(approx|about|jumbo|extra|family pack)/i.test(field.value);

          if (hasValidUnit && !hasInvalidQualifier) {
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              legalReference: rule.legalReference,
              status: 'PASS',
              severity: rule.severity,
              reason: 'Net quantity declared in compliant standard metric unit.',
              detectedDetails: `Declared Net Quantity: "${field.value}"`,
              evidence: field.evidence ? [field.evidence] : [],
              confidence: field.confidence,
              recommendedAction: 'Compliant declaration detected.'
            });
          } else if (hasInvalidQualifier) {
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              legalReference: rule.legalReference,
              status: 'REVIEW_REQUIRED',
              severity: rule.severity,
              reason: 'Net quantity contains extraneous promotional qualifiers prohibited under Rule 12.',
              detectedDetails: `Detected: "${field.value}"`,
              missingDetails: 'Standard unadulterated metric net quantity statement',
              evidence: field.evidence ? [field.evidence] : [],
              confidence: 'MEDIUM',
              recommendedAction: 'Review whether qualifying words affect legal net quantity representation.'
            });
          } else {
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              legalReference: rule.legalReference,
              status: 'REVIEW_REQUIRED',
              severity: rule.severity,
              reason: 'Net quantity detected but unit format requires verification against standard metric units.',
              detectedDetails: `Detected: "${field.value}"`,
              missingDetails: 'Standard metric abbreviation (g, kg, ml, l, N)',
              evidence: field.evidence ? [field.evidence] : [],
              confidence: field.confidence,
              recommendedAction: 'Manual verification required to verify unit adherence.'
            });
          }
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'FAIL',
            severity: rule.severity,
            reason: 'Potential non-compliance: Net quantity declaration not detected on package.',
            detectedDetails: 'Net quantity is missing from visible package text.',
            missingDetails: 'Mandatory standard metric net weight/volume/count declaration',
            evidence: [],
            confidence: 'HIGH',
            recommendedAction: 'Manual inspection required. Check if printed on lower or top seal.'
          });
        }
        break;
      }

      case 'RULE_6_1_E_MRP_DECLARATION': {
        const field = declarations.mrp;
        if (field.status === 'DETECTED' && field.value) {
          const hasTaxMention = /(incl|inclusive|all taxes)/i.test(field.value);
          const hasCurrency = /(rs|inr|₹|\b\d+(?:\.\d{2})?\b)/i.test(field.value);

          if (hasCurrency && hasTaxMention) {
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              legalReference: rule.legalReference,
              status: 'PASS',
              severity: rule.severity,
              reason: 'MRP declared with explicit tax inclusion statement.',
              detectedDetails: `Declared MRP: "${field.value}"`,
              evidence: field.evidence ? [field.evidence] : [],
              confidence: field.confidence,
              recommendedAction: 'Compliant MRP format detected.'
            });
          } else {
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              legalReference: rule.legalReference,
              status: 'REVIEW_REQUIRED',
              severity: rule.severity,
              reason: 'MRP detected, but "inclusive of all taxes" wording requires confirmation.',
              detectedDetails: `Detected MRP text: "${field.value}"`,
              missingDetails: 'Explicit "(incl. of all taxes)" declaration under Rule 6(1)(e)',
              evidence: field.evidence ? [field.evidence] : [],
              confidence: field.confidence,
              recommendedAction: 'Manual verification recommended to confirm presence of tax-inclusive wording.'
            });
          }
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'FAIL',
            severity: rule.severity,
            reason: 'Potential non-compliance: Maximum Retail Price (MRP) not detected.',
            detectedDetails: 'No retail price declaration detected on scanned surfaces.',
            missingDetails: 'Mandatory Maximum Retail Price (MRP Rs. ... incl. of all taxes)',
            evidence: [],
            confidence: 'HIGH',
            recommendedAction: 'Manual inspection required. Check back panel or bottom flap for stamped price.'
          });
        }
        break;
      }

      case 'RULE_18_MRP_CONSISTENCY': {
        const field = declarations.mrp;
        if (field.inconsistencyFlag && field.alternativeValues && field.alternativeValues.length > 1) {
          const details = field.alternativeValues.map(v => `${v.side.toUpperCase()}: ${v.value}`).join(' vs ');
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'FAIL',
            severity: 'CRITICAL',
            reason: 'Potential non-compliance: Different MRP values detected across package surfaces.',
            detectedDetails: `Conflicting values: ${details}`,
            missingDetails: 'Single uniform retail price declaration',
            evidence: field.evidence ? [field.evidence] : [],
            confidence: 'HIGH',
            recommendedAction: 'Manual verification required. Check for dual-stickering or overprinting violations.'
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'PASS',
            severity: 'CRITICAL',
            reason: 'No conflicting MRP declarations detected across images.',
            detectedDetails: field.value ? `Consistent MRP: ${field.value}` : 'No conflict detected',
            evidence: field.evidence ? [field.evidence] : [],
            confidence: 'HIGH',
            recommendedAction: 'No dual-pricing conflict observed.'
          });
        }
        break;
      }

      case 'RULE_6_1_AB_MANUFACTURER_DETAILS': {
        const mfg = declarations.manufacturer;
        const addr = declarations.manufacturer_address;
        const pkr = declarations.packer;
        const imp = declarations.importer;

        const hasEntity = (mfg.status === 'DETECTED' && mfg.value) || 
                          (pkr.status === 'DETECTED' && pkr.value) || 
                          (imp.status === 'DETECTED' && imp.value);
        const hasAddress = addr.status === 'DETECTED' && addr.value && addr.value.length > 5;

        if (hasEntity && hasAddress) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'PASS',
            severity: rule.severity,
            reason: 'Identifiable manufacturer/packer/importer name and physical address detected.',
            detectedDetails: `Entity: "${mfg.value || pkr.value || imp.value}" | Address: "${addr.value}"`,
            evidence: [mfg.evidence, addr.evidence].filter(Boolean) as any,
            confidence: 'HIGH',
            recommendedAction: 'Compliant entity address declaration.'
          });
        } else if (hasEntity && !hasAddress) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'REVIEW_REQUIRED',
            severity: rule.severity,
            reason: 'Entity name detected, but complete physical postal address requires verification.',
            detectedDetails: `Entity: "${mfg.value || pkr.value || imp.value}"`,
            missingDetails: 'Complete street, city, state and PIN code address',
            evidence: mfg.evidence ? [mfg.evidence] : [],
            confidence: 'MEDIUM',
            recommendedAction: 'Manual verification required. Check if full address is printed in fine print.'
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'FAIL',
            severity: rule.severity,
            reason: 'Potential non-compliance: Manufacturer, Packer, or Importer identification missing.',
            detectedDetails: 'No manufacturer/packer/importer name detected.',
            missingDetails: 'Mandatory name and complete address of responsible entity',
            evidence: [],
            confidence: 'HIGH',
            recommendedAction: 'Manual inspection required. Check back panel or side seam.'
          });
        }
        break;
      }

      case 'RULE_6_1_D_DATE_OF_MANUFACTURE': {
        const field = declarations.manufacturing_or_packing_date;
        if (field.status === 'DETECTED' && field.value) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'PASS',
            severity: rule.severity,
            reason: 'Month and year of manufacture/packing detected.',
            detectedDetails: `Date Declaration: "${field.value}"`,
            evidence: field.evidence ? [field.evidence] : [],
            confidence: field.confidence,
            recommendedAction: 'Date declaration present.'
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'REVIEW_REQUIRED',
            severity: rule.severity,
            reason: 'Manufacture or pre-packing date not clearly visible in package images.',
            detectedDetails: 'Mfg/Packing date not detected in scanned text.',
            missingDetails: 'Month & Year of manufacture or packing (MM/YYYY)',
            evidence: [],
            confidence: 'MEDIUM',
            recommendedAction: 'Manual verification required. Check crimp, inkjet stamp, or bottom fold.'
          });
        }
        break;
      }

      case 'RULE_6_1_DA_BEST_BEFORE': {
        const field = declarations.best_before_or_expiry;
        if (field.status === 'DETECTED' && field.value) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'PASS',
            severity: rule.severity,
            reason: 'Best before / expiry statement detected.',
            detectedDetails: `Expiry/Shelf life: "${field.value}"`,
            evidence: field.evidence ? [field.evidence] : [],
            confidence: field.confidence,
            recommendedAction: 'Declared shelf-life compliance observed.'
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'REVIEW_REQUIRED',
            severity: rule.severity,
            reason: 'Best before / use by date not identified. Commodity category determination needed.',
            detectedDetails: 'Expiry declaration not detected.',
            missingDetails: 'Best before date (mandatory for perishable commodities)',
            evidence: [],
            confidence: 'LOW',
            recommendedAction: 'Manual verification required. Confirm if commodity is perishable or non-perishable.'
          });
        }
        break;
      }

      case 'RULE_6_2_CONSUMER_CARE': {
        const field = declarations.consumer_care_details;
        if (field.status === 'DETECTED' && field.value) {
          const hasPhone = /(\d{3,}[-\s]?\d{3,}|1800[-\s]?\d+|toll\s*free)/i.test(field.value);
          const hasEmail = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i.test(field.value);

          if (hasPhone || hasEmail) {
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              legalReference: rule.legalReference,
              status: 'PASS',
              severity: rule.severity,
              reason: 'Consumer care contact channels detected on package.',
              detectedDetails: `Contact details: "${field.value}"`,
              evidence: field.evidence ? [field.evidence] : [],
              confidence: field.confidence,
              recommendedAction: 'Consumer grievance redressal channels present.'
            });
          } else {
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              legalReference: rule.legalReference,
              status: 'REVIEW_REQUIRED',
              severity: rule.severity,
              reason: 'Consumer care reference found, but telephone or email address requires verification.',
              detectedDetails: `Detected text: "${field.value}"`,
              missingDetails: 'Specific customer care telephone number or email address',
              evidence: field.evidence ? [field.evidence] : [],
              confidence: 'MEDIUM',
              recommendedAction: 'Manual verification required to confirm reachable consumer care contact.'
            });
          }
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'FAIL',
            severity: rule.severity,
            reason: 'Potential non-compliance: Consumer care cell contact details missing.',
            detectedDetails: 'No consumer care contact detected.',
            missingDetails: 'Mandatory phone/toll-free, email, or address for consumer grievance redressal',
            evidence: [],
            confidence: 'HIGH',
            recommendedAction: 'Manual inspection required. Verify if printed on secondary label.'
          });
        }
        break;
      }

      case 'RULE_6_1_F_COUNTRY_OF_ORIGIN': {
        const field = declarations.country_of_origin;
        if (field.status === 'DETECTED' && field.value) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'PASS',
            severity: rule.severity,
            reason: 'Country of origin / manufacturing territory explicitly declared.',
            detectedDetails: `Country of Origin: "${field.value}"`,
            evidence: field.evidence ? [field.evidence] : [],
            confidence: field.confidence,
            recommendedAction: 'Origin declaration verified.'
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'REVIEW_REQUIRED',
            severity: rule.severity,
            reason: 'Explicit country of origin string not detected. Verify if implied by manufacturer address.',
            detectedDetails: 'Origin declaration not explicitly isolated.',
            missingDetails: 'Country of origin (mandatory for imported commodities)',
            evidence: [],
            confidence: 'LOW',
            recommendedAction: 'Manual verification required. Confirm whether product is imported or domestic.'
          });
        }
        break;
      }

      case 'RULE_7_READABILITY_CONTRAST': {
        let poorReadabilityCount = 0;
        let totalScanned = 0;

        for (const side of ['front', 'back', 'upper', 'lower'] as SideType[]) {
          const item = rawTexts[side];
          if (item) {
            totalScanned++;
            if (item.readabilityAssessment === 'NOT_READABLE' || item.readabilityAssessment === 'POTENTIALLY_DIFFICULT') {
              poorReadabilityCount++;
            }
          }
        }

        if (totalScanned > 0 && poorReadabilityCount === 0) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'PASS',
            severity: rule.severity,
            reason: 'Package typography and contrast screen cleanly without severe occlusion or blur.',
            detectedDetails: `${totalScanned} sides scanned with adequate contrast and clarity.`,
            evidence: [],
            confidence: 'HIGH',
            recommendedAction: 'Visual legibility screening passed.'
          });
        } else if (poorReadabilityCount > 0) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'REVIEW_REQUIRED',
            severity: rule.severity,
            reason: 'Visual screening detected potential contrast, blur, or glare issues on one or more sides.',
            detectedDetails: `${poorReadabilityCount} image(s) flagged for potential legibility difficulty.`,
            missingDetails: 'Uniform high-contrast background printing across all panels',
            evidence: [],
            confidence: 'MEDIUM',
            recommendedAction: 'Manual verification required. Physical sample inspection recommended.'
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'NOT_DETERMINABLE',
            severity: rule.severity,
            reason: 'Insufficient images captured to screen declaration readability.',
            detectedDetails: 'No images available for legibility assessment.',
            evidence: [],
            confidence: 'LOW',
            recommendedAction: 'Capture front and back package sides to complete readability screening.'
          });
        }
        break;
      }

      case 'RULE_7_1_MINIMUM_FONT_SIZE': {
        // Critical requirement: Never claim exact mm without physical scale!
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          legalReference: rule.legalReference,
          status: 'REVIEW_REQUIRED',
          severity: rule.severity,
          reason: 'Physical font size cannot be reliably determined from standard camera photographs without a calibrated physical reference scale.',
          detectedDetails: 'Digital image scale lacks metric reference or millimeter gauge.',
          missingDetails: 'Calibrated optical millimeter reference scale',
          evidence: [],
          confidence: 'HIGH',
          recommendedAction: 'Manual verification required with physical measurement gauge (Rule 7 Table compliance).'
        });
        break;
      }

      case 'RULE_9_PLACEMENT_PDP': {
        const nameSide = declarations.product_name.sourceImage;
        const qtySide = declarations.net_quantity.sourceImage;

        if (nameSide === 'front' && qtySide === 'front') {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'PASS',
            severity: rule.severity,
            reason: 'Product name and net quantity are both positioned on the Principal Display Panel (Front).',
            detectedDetails: 'Name: Front image, Net Quantity: Front image',
            evidence: [declarations.product_name.evidence, declarations.net_quantity.evidence].filter(Boolean) as any,
            confidence: 'HIGH',
            recommendedAction: 'Principal Display Panel grouping verified.'
          });
        } else if (nameSide || qtySide) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'REVIEW_REQUIRED',
            severity: rule.severity,
            reason: 'Name or quantity placed on secondary panel (Back/Upper/Lower). Confirm PDP boundaries.',
            detectedDetails: `Name on: ${nameSide || 'unknown'}, Quantity on: ${qtySide || 'unknown'}`,
            missingDetails: 'Consolidated grouping on primary display surface',
            evidence: [declarations.product_name.evidence, declarations.net_quantity.evidence].filter(Boolean) as any,
            confidence: 'MEDIUM',
            recommendedAction: 'Manual verification required to confirm principal display panel designation.'
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            legalReference: rule.legalReference,
            status: 'REVIEW_REQUIRED',
            severity: rule.severity,
            reason: 'Display panel placement cannot be verified without detected identity declarations.',
            detectedDetails: 'Missing both name and quantity placement coordinates.',
            evidence: [],
            confidence: 'LOW',
            recommendedAction: 'Manual review required.'
          });
        }
        break;
      }

      default:
        break;
    }
  }

  // Calculate Screening Score
  const criticalFails = results.filter(r => r.severity === 'CRITICAL' && r.status === 'FAIL').length;
  const majorFails = results.filter(r => r.severity === 'MAJOR' && r.status === 'FAIL').length;
  const reviewRequiredCount = results.filter(r => r.status === 'REVIEW_REQUIRED').length;
  const passesCount = results.filter(r => r.status === 'PASS').length;
  const totalEvaluated = results.length || 1;

  // Weighted score calculation
  let mandatoryScore = 100;
  const mandatoryRules = results.filter(r => r.ruleId.startsWith('RULE_6_1') || r.ruleId === 'RULE_18_MRP_CONSISTENCY');
  const mandatoryPasses = mandatoryRules.filter(r => r.status === 'PASS').length;
  if (mandatoryRules.length > 0) {
    mandatoryScore = Math.round((mandatoryPasses / mandatoryRules.length) * 100);
  }

  const readabilityResult = results.find(r => r.ruleId === 'RULE_7_READABILITY_CONTRAST');
  let readabilityScore = readabilityResult?.status === 'PASS' ? 95 : readabilityResult?.status === 'REVIEW_REQUIRED' ? 65 : 40;

  let consistencyScore = productIdentity.isConsistent ? 95 : 30;
  if (declarations.mrp.inconsistencyFlag) consistencyScore = Math.min(consistencyScore, 20);

  let evidenceWithBoxes = 0;
  let totalEvidence = 0;
  for (const key of Object.keys(declarations)) {
    const field = (declarations as any)[key];
    if (field && field.status === 'DETECTED') {
      totalEvidence++;
      if (field.evidence?.boundingBox) evidenceWithBoxes++;
    }
  }
  const evidenceQualityScore = totalEvidence > 0 ? Math.round((evidenceWithBoxes / totalEvidence) * 40 + 60) : 50;

  // Overall combined score (0 - 100)
  let overall = Math.round(
    mandatoryScore * 0.45 +
    readabilityScore * 0.20 +
    consistencyScore * 0.20 +
    evidenceQualityScore * 0.15
  );

  // Hard penalties for critical non-compliance
  if (criticalFails > 0) {
    overall = Math.min(overall, 58);
  } else if (!productIdentity.isConsistent) {
    overall = Math.min(overall, 45);
  }

  let status: 'PASS' | 'REVIEW REQUIRED' | 'POTENTIAL NON-COMPLIANCE';
  if (criticalFails > 0 || majorFails >= 2 || !productIdentity.isConsistent) {
    status = 'POTENTIAL NON-COMPLIANCE';
  } else if (reviewRequiredCount > 0 || overall < 85) {
    status = 'REVIEW REQUIRED';
  } else {
    status = 'PASS';
  }

  const screeningScore: ScreeningScore = {
    overall,
    mandatoryScore,
    readabilityScore,
    consistencyScore,
    evidenceQualityScore,
    status,
    disclaimer: 'This screening score is an algorithmic screening tool and does not constitute a legal determination under the Legal Metrology Act, 2009. Final legal verification must be performed by the authorized enforcement authority.'
  };

  const normalizedResults = results.map(r => ({
    ...r,
    explanation: r.explanation || r.reason,
    detectedElements: r.detectedElements || (r.detectedDetails ? [r.detectedDetails] : []),
    missingElements: r.missingElements || (r.missingDetails ? [r.missingDetails] : [])
  }));

  return { ruleResults: normalizedResults, screeningScore };
}
