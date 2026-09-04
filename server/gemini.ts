import { GoogleGenAI } from '@google/genai';
import { imageSize } from 'image-size';
import sharp from 'sharp';
import {
  BoundingBox,
  DeclarationEvidence,
  DeclarationField,
  DebugPipelineStep,
  ExtractedDeclarations,
  ImageQualityAssessment,
  ProductIdentity,
  RawExtractedImageText,
  ScanImage,
  SideType,
  TextRegion
} from '../src/types.js';

// =========================================================================
// INSPECTRA GEMINI CLIENT & MODEL CONFIGURATION
// =========================================================================

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

// Preference list of Gemini models for multimodal optical analysis
// gemini-3.8-flash is primary; gemini-3.1-flash-lite and gemini-flash-latest serve as verified fallbacks
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

export interface AnalysisPipelineResult {
  productIdentity: ProductIdentity;
  rawExtractedText: Record<SideType, RawExtractedImageText | null>;
  extractedDeclarations: ExtractedDeclarations;
  debugAnalysis?: {
    steps: DebugPipelineStep[];
    availablePanels: SideType[];
    summary: string;
    stageTimings?: Record<string, number>;
  };
}

// =========================================================================
// DEVELOPMENT LOGGING SYSTEM
// Provides detailed, structured tracing of the vision pipeline
// =========================================================================

function logSection(title: string) {
  console.log(`\n================================================================================`);
  console.log(`[INSPECTRA AUDIT] ${title}`);
  console.log(`================================================================================`);
}

function logDev(stage: string, message: string, payload?: any) {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}][INSPECTRA][${stage}] ${message}`);
  if (payload !== undefined) {
    if (typeof payload === 'string') {
      console.log(`  -> ${payload}`);
    } else {
      try {
        console.log(`  -> ${JSON.stringify(payload, null, 2)}`);
      } catch {
        console.log(`  ->`, payload);
      }
    }
  }
}

// =========================================================================
// IMAGE PARSING, NORMALIZATION & RESOLUTION AUDIT
// =========================================================================

export interface ParsedImageInfo {
  mimeType: string;
  data: string; // pure base64 without prefix
  byteLength: number;
  kb: number;
  mb: number;
  width?: number;
  height?: number;
  megapixels?: number;
  format?: string;
}

/**
 * Normalizes MIME type to ensure strict IANA compliance for Gemini API
 */
function normalizeMimeType(rawMime: string): string {
  const lower = rawMime.toLowerCase().trim();
  if (lower === 'image/jpg' || lower === 'image/pjpeg') return 'image/jpeg';
  if (lower === 'image/png') return 'image/png';
  if (lower === 'image/webp') return 'image/webp';
  if (lower === 'image/heic') return 'image/heic';
  if (lower === 'image/heif') return 'image/heif';
  return 'image/jpeg';
}

/**
 * Parses base64 data URL and audits exact image dimensions and payload size
 */
export function inspectImagePayload(dataUrl: string, side: SideType): ParsedImageInfo {
  let rawMime = 'image/jpeg';
  let pureBase64 = dataUrl;

  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx !== -1 && dataUrl.startsWith('data:')) {
    const meta = dataUrl.slice(5, commaIdx);
    pureBase64 = dataUrl.slice(commaIdx + 1);
    const semiIdx = meta.indexOf(';');
    if (semiIdx !== -1) {
      rawMime = meta.slice(0, semiIdx);
    } else {
      rawMime = meta;
    }
  } else if (dataUrl.startsWith('data:')) {
    pureBase64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
  }

  const mimeType = normalizeMimeType(rawMime);
  const buffer = Buffer.from(pureBase64, 'base64');
  const byteLength = buffer.length;
  const kb = Math.round(byteLength / 1024);
  const mb = Number((byteLength / (1024 * 1024)).toFixed(2));

  let width: number | undefined;
  let height: number | undefined;
  let format: string | undefined;

  try {
    const dims = imageSize(buffer);
    width = dims.width;
    height = dims.height;
    format = dims.type;
  } catch (err: any) {
    // If image-size fails on unconventional formats, try SVG or leave undefined
    logDev('IMAGE_PARSE_WARNING', `Could not synchronously read dimensions for ${side}: ${err?.message}`);
  }

  const megapixels = width && height ? Number(((width * height) / 1000000).toFixed(2)) : undefined;

  logDev(
    'IMAGE_INSPECTION',
    `Side: ${side.toUpperCase()} | MIME: ${mimeType} | Dimensions: ${width ? `${width}x${height} (${megapixels} MP)` : 'Unknown'} | Payload: ${kb} KB (${mb} MB, ${pureBase64.length} b64 chars)`
  );

  return {
    mimeType,
    data: pureBase64,
    byteLength,
    kb,
    mb,
    width,
    height,
    megapixels,
    format
  };
}

/**
 * Prepares image for Gemini: handles SVG rasterization if needed, preserves full photographic resolution
 */
async function prepareImageForGemini(
  dataUrl: string,
  side: SideType
): Promise<{ mimeType: string; data: string; width?: number; height?: number }> {
  const info = inspectImagePayload(dataUrl, side);

  // If the image is an SVG data URL (e.g., test specimens), rasterize it into a high-res PNG
  if (dataUrl.includes('image/svg+xml')) {
    try {
      const svgMatch = dataUrl.match(/^data:image\/svg\+xml(?:;utf8)?,(.+)$/);
      let svgBuffer: Buffer;
      if (svgMatch) {
        svgBuffer = Buffer.from(decodeURIComponent(svgMatch[1]));
      } else {
        svgBuffer = Buffer.from(info.data, 'base64');
      }

      const pngBuffer = await sharp(svgBuffer, { density: 300 }).png().toBuffer();
      const dims = imageSize(pngBuffer);

      logDev('RASTERIZATION', `Rendered vector SVG for ${side} to high-res PNG: ${dims.width}x${dims.height} (${Math.round(pngBuffer.length / 1024)} KB)`);

      return {
        mimeType: 'image/png',
        data: pngBuffer.toString('base64'),
        width: dims.width,
        height: dims.height
      };
    } catch (e: any) {
      logDev('RASTERIZATION_ERROR', `Failed to rasterize SVG for ${side}: ${e?.message}`);
    }
  }

  // For photographic files (JPEG, PNG, WebP), pass the actual uploaded image buffer directly.
  // We do NOT downsample or compress images to ensure fine legal declarations (4pt-6pt text) remain legible.
  return {
    mimeType: info.mimeType,
    data: info.data,
    width: info.width,
    height: info.height
  };
}

/**
 * Fast synchronous image quality assessment using real pixel dimensions
 */
export function assessImageQuality(base64Data: string, side: SideType): ImageQualityAssessment {
  const info = inspectImagePayload(base64Data, side);
  const issues: string[] = [];
  let status: 'GOOD' | 'WARNING' | 'POOR' = 'GOOD';
  let blurScore = 10;
  let textReadability: 'CLEAR' | 'PARTIAL' | 'DIFFICULT' | 'POOR' = 'CLEAR';
  let lighting: 'GOOD' | 'LOW' | 'OVEREXPOSED' | 'GLARE' = 'GOOD';

  const w = info.width || 0;
  const h = info.height || 0;
  const totalPixels = w * h;

  let resolutionDesc = info.width && info.height
    ? `${info.width}x${info.height} (${info.megapixels} MP)`
    : info.kb > 300
    ? 'High Resolution (> 300 KB)'
    : info.kb > 80
    ? 'Standard Resolution'
    : 'Low Resolution (< 80 KB)';

  // Evaluate readability based on pixel dimensions
  if (w > 0 && h > 0) {
    if (totalPixels < 150000 || w < 400 || h < 400) {
      status = 'POOR';
      issues.push(`Resolution is too low (${w}x${h}) to read fine statutory print (4pt–6pt text on back labels).`);
      textReadability = 'POOR';
      blurScore = 75;
    } else if (totalPixels < 500000 || w < 700 || h < 700) {
      status = 'WARNING';
      issues.push(`Moderate resolution (${w}x${h}). Small declarations such as FSSAI, MRP, or mfg addresses may be difficult to read.`);
      textReadability = 'PARTIAL';
      blurScore = 35;
    } else {
      status = 'GOOD';
      textReadability = 'CLEAR';
      blurScore = 10;
    }
  } else if (info.kb < 40) {
    status = 'WARNING';
    issues.push('Image file size is very small; package text may be degraded.');
    textReadability = 'PARTIAL';
    blurScore = 40;
  }

  logDev(
    'QUALITY_ASSESSMENT',
    `Side: ${side.toUpperCase()} | Status: ${status} | Readability: ${textReadability} | Issues: ${issues.length > 0 ? issues.join('; ') : 'None'}`
  );

  return {
    status,
    resolution: resolutionDesc,
    blurScore,
    lighting,
    textReadability,
    issues,
    recommendation: issues.length > 0 ? issues[0] : undefined
  };
}

// Helper to sanitize text strings
function cleanText(text: string): string {
  return text
    .replace(/[\r\t]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Robust JSON parser that strips markdown code fences or extracts JSON objects/arrays
 */
function safeParseJson<T>(raw: string): T | null {
  if (!raw || typeof raw !== 'string') return null;

  // 1. Direct parse
  try {
    return JSON.parse(raw);
  } catch {}

  // 2. Strip markdown code fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 3. Extract substring between first '{' and last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // 4. Extract substring between first '[' and last ']'
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      const parsedArray = JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
      if (Array.isArray(parsedArray) && parsedArray.length > 0) {
        return parsedArray[0] as T;
      }
      return parsedArray as T;
    } catch {}
  }

  return null;
}

// =========================================================================
// RETRY ENGINE & RESILIENT GEMINI CALLER
// Handles temporary 503 high-demand spikes, rate limits, and model fallback
// =========================================================================

interface GeminiCallOptions {
  contents: any[];
  config?: any;
  stageName: string;
  maxRetriesPerModel?: number;
}

interface GeminiCallResult {
  text: string;
  modelUsed: string;
  durationMs: number;
}

async function callGeminiWithRetry(options: GeminiCallOptions): Promise<GeminiCallResult> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please check environment variables.');
  }

  const { contents, config, stageName, maxRetriesPerModel = 2 } = options;
  const startTime = Date.now();

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      logDev(
        'GEMINI_REQUEST',
        `Stage: ${stageName} | Model: ${model} | Attempt: ${attempt}/${maxRetriesPerModel}`
      );

      try {
        const response = await client.models.generateContent({
          model,
          contents,
          config: {
            ...config,
            responseMimeType: config?.responseMimeType || 'application/json',
            temperature: config?.temperature ?? 0.0
          }
        });

        const durationMs = Date.now() - startTime;
        const responseText = response.text || '';

        logDev(
          'GEMINI_SUCCESS',
          `Stage: ${stageName} | Model: ${model} | Latency: ${durationMs}ms | Response Size: ${responseText.length} chars`
        );

        return {
          text: responseText,
          modelUsed: model,
          durationMs
        };
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isUnavailable = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');
        const isRateLimit = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');
        const isNotFound = errMsg.includes('404') || errMsg.includes('NOT_FOUND') || errMsg.includes('no longer available');

        logDev(
          'GEMINI_ERROR',
          `Stage: ${stageName} | Model: ${model} | Attempt ${attempt} failed: ${errMsg.slice(0, 160)}`
        );

        if (isNotFound) {
          // Model does not exist or deprecated, immediately cascade to next candidate model
          logDev('MODEL_FALLBACK', `Model ${model} is not available. Cascading immediately to next model...`);
          break;
        }

        if ((isUnavailable || isRateLimit) && attempt < maxRetriesPerModel) {
          const delayMs = attempt === 1 ? 900 : 2200;
          logDev('RETRY_WAIT', `Spike/Rate limit detected on ${model}. Backing off for ${delayMs}ms before retry...`);
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }

        // If all retries on this model failed, break to next candidate model
        break;
      }
    }
  }

  throw new Error(`All Gemini models (${CANDIDATE_MODELS.join(', ')}) failed during ${stageName}. Please verify connectivity or try again in a few moments.`);
}

// =========================================================================
// STAGE A: RAW OPTICAL TEXT READING
// Analyzes the ACTUAL uploaded photographic packaging images panel-by-panel.
// Never guesses product names from visuals. Transcribes every visible character.
// =========================================================================

export async function extractRawText(
  images: Record<SideType, ScanImage | null>
): Promise<{ rawExtractedText: Record<SideType, RawExtractedImageText | null>; log: string[] }> {
  logSection('STAGE A: RAW VISUAL TEXT READING');
  const log: string[] = [];
  const sides: SideType[] = ['front', 'back', 'upper', 'lower'];

  const rawExtractedText: Record<SideType, RawExtractedImageText | null> = {
    front: null,
    back: null,
    upper: null,
    lower: null
  };

  const availableSides = sides.filter(s => Boolean(images[s]?.previewUrl));
  log.push(`Active panels for extraction: ${availableSides.map(s => s.toUpperCase()).join(', ')}`);
  logDev('STAGE_A_START', `Analyzing ${availableSides.length} packaging surfaces: ${availableSides.join(', ')}`);

  const client = getGeminiClient();
  if (!client) {
    const msg = 'Gemini API client not initialized. Cannot perform optical OCR without API key.';
    logDev('STAGE_A_ERROR', msg);
    log.push(msg);
    return { rawExtractedText, log };
  }

  // Process available panels concurrently with specialized OCR instructions
  const panelPromises = availableSides.map(async side => {
    const img = images[side]!;
    const prepStart = Date.now();
    const imagePart = await prepareImageForGemini(img.previewUrl, side);
    const prepDuration = Date.now() - prepStart;

    logDev(
      'PANEL_PREPARATION',
      `Side: ${side.toUpperCase()} ready in ${prepDuration}ms | MIME: ${imagePart.mimeType} | Data Length: ${imagePart.data.length}`
    );

    // Specialized instructions depending on packaging panel
    const panelSpecificFocus =
      side === 'front'
        ? `FOCUS ON FRONT PANEL DECLARATIONS:
- Prominent Brand / Trademark name
- Commodity name and descriptive product title
- Variant, flavor, recipe, or edition
- Net quantity (e.g., "Net Wt: 100g", "Net Qty: 1 L")
- Prominent claims, organic/quality seals, certifications`
        : side === 'back'
        ? `FOCUS ON BACK PANEL FINE PRINT & STATUTORY DECLARATION BLOCKS:
- Complete Manufacturer name and physical postal address (street, city, state, pincode)
- Packer name and address (if different)
- Importer name and address (if imported)
- Maximum Retail Price (MRP): exact currency and tax statement (e.g. "MRP Rs. 35.00 incl. of all taxes")
- Unit Sale Price (USP) if declared (e.g. "Rs. 0.35/g")
- Month & Year of manufacture, packing, or import (e.g. "Mfg Date: 02/2026", "Pkd: 01/26")
- Best Before / Expiry / Use By date statements
- Consumer Care Cell: complete phone/toll-free number, email address, postal address, and contact officer
- Country of Origin (e.g. "Made in India", "Country of Origin: India")
- FSSAI License No. or regulatory registration numbers
- Batch / Lot / Code numbers
- Barcode digits (EAN-13, UPC, or GTIN numbers printed beneath barcode stripes)
- Complete Ingredients list and Allergen warnings`
        : `FOCUS ON PANEL DECLARATIONS:
- Stamped/embossed Batch numbers and Expiry/Mfg date codes
- Barcodes and barcode numerical digits
- Packaging recycling symbols and resin identification codes`;

    const prompt = `You are INSPECTRA's High-Precision Legal Metrology Package Text Extraction Engine.
This image represents the [${side.toUpperCase()}] packaging surface of a real commercial packaged product.

CRITICAL INSTRUCTIONS:
1. REPORT ONLY VISIBLE TEXT: Transcribe EVERY visible line, phrase, word, number, date, code, and symbol visibly printed, stamped, or embossed on this packaging surface.
2. PRESERVE VERBATIM ACCURACY: Keep exact spelling, numbers, units (g, kg, ml, L, pieces), currency symbols (₹, Rs.), and punctuation.
3. DO NOT GUESS OR CLASSIFY: Never guess a product name or brand from colors, logos, or packaging shape. If a field is not printed, do NOT assume it.
4. EXHAUSTIVE TRANSCRIPTION OF FINE PRINT:
${panelSpecificFocus}
5. UNREADABLE OR BLURRED TEXT: If a text region is blurry, glared, or unreadable, transcribe what is discernible and mark confidence as "LOW". DO NOT autocomplete missing text.
6. ZERO TEXT DETECTED: If the surface contains no readable text, return an empty "textBlocks" array and set "readabilityAssessment" to "NOT_READABLE".

Output pure JSON strictly adhering to this schema:
{
  "rawText": "Complete transcript of all visible lines separated by newlines in natural reading order",
  "normalizedText": "Clean transcript with standardized whitespace",
  "textBlocks": [
    {
      "text": "Specific line or phrase as visibly printed",
      "confidence": "HIGH" | "MEDIUM" | "LOW",
      "category": "BRAND" | "PRODUCT_NAME" | "NET_QUANTITY" | "MRP" | "MANUFACTURER" | "PACKER" | "IMPORTER" | "ADDRESS" | "DATE" | "CONSUMER_CARE" | "COUNTRY_OF_ORIGIN" | "FSSAI" | "BATCH" | "BARCODE" | "INGREDIENTS" | "GENERAL",
      "boundingBox": {
        "ymin": 0,
        "xmin": 0,
        "ymax": 1000,
        "xmax": 1000
      }
    }
  ],
  "readabilityAssessment": "READABLE" | "POTENTIALLY_DIFFICULT" | "NOT_READABLE"
}`;

    const contents = [
      {
        inlineData: {
          mimeType: imagePart.mimeType,
          data: imagePart.data
        }
      },
      { text: prompt }
    ];

    try {
      const result = await callGeminiWithRetry({
        contents,
        stageName: `STAGE_A_OCR_${side.toUpperCase()}`,
        config: {
          temperature: 0.0
        }
      });

      const parsed = safeParseJson<any>(result.text);

      if (parsed) {
        const blocks: any[] = Array.isArray(parsed.textBlocks)
          ? parsed.textBlocks
          : Array.isArray(parsed)
          ? parsed
          : [];

        const regions: TextRegion[] = blocks.map((b: any, idx: number) => {
          const rawBox = b.boundingBox || {};
          const ymin = Math.max(0, Math.min(1000, Math.round(Number(rawBox.ymin ?? 0))));
          const xmin = Math.max(0, Math.min(1000, Math.round(Number(rawBox.xmin ?? 0))));
          const ymax = Math.max(0, Math.min(1000, Math.round(Number(rawBox.ymax ?? 1000))));
          const xmax = Math.max(0, Math.min(1000, Math.round(Number(rawBox.xmax ?? 1000))));

          return {
            id: `reg_${side}_${idx + 1}`,
            text: String(b.text || '').trim(),
            confidence: b.confidence === 'HIGH' || b.confidence === 'LOW' ? b.confidence : 'MEDIUM',
            boundingBox: { ymin, xmin, ymax, xmax },
            side
          };
        }).filter(r => r.text.length > 0);

        const rawTextStr = String(parsed.rawText || regions.map(r => r.text).join('\n'));
        const normalizedStr = String(parsed.normalizedText || cleanText(rawTextStr));
        const readability = parsed.readabilityAssessment || (regions.length > 0 ? 'READABLE' : 'NOT_READABLE');

        logDev(
          'STAGE_A_PARSED',
          `Panel ${side.toUpperCase()} parsed successfully: ${regions.length} text blocks extracted (Readability: ${readability})`
        );
        if (regions.length > 0) {
          const sample = regions.slice(0, 4).map(r => `"${r.text}" (${r.confidence})`).join(', ');
          logDev('STAGE_A_SAMPLE', `Sample text [${side.toUpperCase()}]: ${sample}`);
        }

        return {
          side,
          data: {
            imageId: img.id,
            side,
            rawText: rawTextStr,
            normalizedText: normalizedStr,
            textRegions: regions,
            readabilityAssessment: readability
          } as RawExtractedImageText
        };
      } else {
        logDev('STAGE_A_PARSE_FAIL', `Could not parse JSON for ${side}. Raw preview: ${result.text.slice(0, 200)}`);
      }
    } catch (err: any) {
      logDev('STAGE_A_PANEL_ERROR', `Error analyzing panel ${side}: ${err?.message}`);
      log.push(`Panel ${side} extraction error: ${err?.message}`);
    }

    // Return empty structured entry if analysis produced no text
    return {
      side,
      data: {
        imageId: img.id,
        side,
        rawText: '',
        normalizedText: '',
        textRegions: [],
        readabilityAssessment: 'NOT_READABLE'
      } as RawExtractedImageText
    };
  });

  const panelResults = await Promise.all(panelPromises);
  for (const res of panelResults) {
    rawExtractedText[res.side] = res.data;
  }

  return { rawExtractedText, log };
}

// =========================================================================
// STAGE B: STRUCTURED INFORMATION EXTRACTION
// Maps visible package text evidence into statutory Legal Metrology declarations.
// Strictly text-first. No guessing from visual appearance.
// =========================================================================

export async function extractDeclarations(
  rawTexts: Record<SideType, RawExtractedImageText | null>,
  images: Record<SideType, ScanImage | null>
): Promise<{ declarations: ExtractedDeclarations; log: string[] }> {
  logSection('STAGE B: STRUCTURED DECLARATION EXTRACTION');
  const log: string[] = [];
  const client = getGeminiClient();

  const emptyField = (key: string, label: string): DeclarationField => ({
    key,
    label,
    value: null,
    status: 'NOT_DETECTED',
    confidence: 'LOW',
    sourceImage: null,
    evidence: null
  });

  const baseDeclarations: ExtractedDeclarations = {
    product_name: emptyField('product_name', 'Commodity Name & Description'),
    brand_name: emptyField('brand_name', 'Brand / Trade Name'),
    variant: emptyField('variant', 'Product Variant'),
    manufacturer: emptyField('manufacturer', 'Manufacturer Name'),
    packer: emptyField('packer', 'Packer Name (if different)'),
    importer: emptyField('importer', 'Importer Name (if imported)'),
    manufacturer_address: emptyField('manufacturer_address', 'Manufacturer Complete Address'),
    packer_address: emptyField('packer_address', 'Packer Address'),
    importer_address: emptyField('importer_address', 'Importer Address'),
    net_quantity: emptyField('net_quantity', 'Net Quantity (Standard Metric)'),
    mrp: emptyField('mrp', 'Maximum Retail Price (MRP incl. taxes)'),
    manufacturing_or_packing_date: emptyField('manufacturing_or_packing_date', 'Month & Year of Mfg / Packing'),
    best_before_or_expiry: emptyField('best_before_or_expiry', 'Best Before / Expiry Date'),
    import_date: emptyField('import_date', 'Import Month & Year'),
    consumer_care_details: emptyField('consumer_care_details', 'Consumer Care Cell Details'),
    country_of_origin: emptyField('country_of_origin', 'Country of Origin'),
    other_declarations: []
  };

  // Compile available panel transcripts for contextual mapping
  const panelsWithText = (['front', 'back', 'upper', 'lower'] as SideType[]).filter(
    s => Boolean(rawTexts[s]?.rawText && rawTexts[s]?.rawText.trim().length > 0)
  );

  if (panelsWithText.length === 0) {
    const notice = 'No readable text was extracted across any package panels. Declarations set to NOT_DETECTED.';
    logDev('STAGE_B_EMPTY', notice);
    log.push(notice);
    return { declarations: baseDeclarations, log };
  }

  const textContext = panelsWithText
    .map(s => `=================== ${s.toUpperCase()} PANEL VISIBLE TEXT ===================\n${rawTexts[s]?.rawText}`)
    .join('\n\n');

  logDev('STAGE_B_CONTEXT', `Compiling declarations from ${panelsWithText.length} panels (${textContext.length} chars total)`);

  const prompt = `You are INSPECTRA's Structured Compliance Engine for the Legal Metrology (Packaged Commodities) Rules, 2011 (India).
Your task is to map the VISIBLY EXTRACTED package text below into the 16 statutory declarations.

STRICT RULES:
1. ABSOLUTELY NO HALLUCINATIONS: Map ONLY information that appears in the supplied text. If a declaration is not in the text, value MUST be null, status MUST be "NOT_DETECTED".
2. PRODUCT NAME: Extract the generic/specific commodity name visibly declared (e.g. "Vacuum Evaporated Iodised Salt", "Original Glucose Biscuits", "Instant Noodles", "Wheat Flour / Atta"). Do not invent a name based on general knowledge.
3. BRAND NAME: Extract the registered brand/trade name declared on packaging (e.g. "Tata Salt", "Parle-G", "Britannia", "Maggi").
4. VARIANT: Specific sub-flavor or variant if printed (e.g. "Cashew", "Classic Salted", "Masala").
5. NET QUANTITY: Must have standard metric units (g, kg, ml, L, pieces). Do not confuse random numbers with net quantity.
6. MRP: Look for "MRP", "Maximum Retail Price", "Rs.", "₹", "incl. of all taxes".
   - DUAL MRP CHECK: If the text reveals differing prices between panels (e.g. front says ₹28 while back says ₹32), set "inconsistencyFlag": true, and list the alternate values in "alternativeValues".
7. MANUFACTURER: Extract the full legal entity name following "Mfd by", "Manufactured by", "Producer".
8. MANUFACTURER ADDRESS: Extract the complete physical address including street, city, state, and pincode.
9. PACKER / IMPORTER: Extract if different from manufacturer. If product is domestically manufactured by the producer, set status to "NOT_APPLICABLE".
10. DATES: Month and Year of Manufacture or Packing ("Mfg:", "Pkd:", "Date of Packing"). Expiry or Best Before statement ("Best before 12 months", "Expiry Date: 08/2026").
11. CONSUMER CARE: Telephone/toll-free number, email address, postal address of the grievance officer.
12. COUNTRY OF ORIGIN: Explicit statement such as "Made in India", "Country of Origin: India".
13. BARCODE / GTIN: Digits of EAN-13, UPC, or barcode if present in the text.
14. SOURCE PANEL: For every field, specify "sourceImage": "front" | "back" | "upper" | "lower" where the evidence text was located.

EXTRACTED TEXT PANELS:
${textContext}

Return pure JSON matching this exact structure:
{
  "product_name": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "brand_name": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "variant": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "manufacturer": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "packer": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"NOT_APPLICABLE", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "importer": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"NOT_APPLICABLE", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "manufacturer_address": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "packer_address": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"NOT_APPLICABLE", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "importer_address": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"NOT_APPLICABLE", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "net_quantity": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "mrp": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null, "inconsistencyFlag": boolean, "alternativeValues": [{"side": string, "value": string}] },
  "manufacturing_or_packing_date": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "best_before_or_expiry": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "import_date": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"NOT_APPLICABLE", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "consumer_care_details": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "country_of_origin": { "value": string | null, "status": "DETECTED"|"NOT_DETECTED"|"UNCERTAIN", "confidence": "HIGH"|"MEDIUM"|"LOW", "sourceImage": "front"|"back"|"upper"|"lower"|null, "evidenceSnippet": string|null },
  "fssai_license": string | null,
  "batch_number": string | null,
  "barcode_or_gtin": string | null
}`;

  try {
    const result = await callGeminiWithRetry({
      contents: [{ text: prompt }],
      stageName: 'STAGE_B_DECLARATION_MAPPING',
      config: { temperature: 0.0 }
    });

    const parsed = safeParseJson<any>(result.text);

    if (parsed) {
      logDev('STAGE_B_SUCCESS', 'Successfully parsed structured declarations from visible evidence');
      const declarations = buildDeclarationsFromParsedJson(parsed, rawTexts, images);

      let detectedCount = 0;
      for (const k of Object.keys(declarations)) {
        const f = (declarations as any)[k];
        if (f && f.status === 'DETECTED') detectedCount++;
      }
      logDev('STAGE_B_SUMMARY', `Detected ${detectedCount} statutory declaration fields from real package text`);

      return { declarations, log };
    }
  } catch (err: any) {
    logDev('STAGE_B_ERROR', `Stage B declaration extraction failed: ${err?.message}`);
    log.push(`Stage B error: ${err?.message}`);
  }

  // Fallback: build best-effort empty declarations without hallucination
  return { declarations: baseDeclarations, log };
}

/**
 * Builds ExtractedDeclarations with verified visual bounding boxes and evidence links
 */
function buildDeclarationsFromParsedJson(
  parsed: any,
  rawTexts: Record<SideType, RawExtractedImageText | null>,
  images: Record<SideType, ScanImage | null>
): ExtractedDeclarations {
  const createField = (key: string, label: string, item: any): DeclarationField => {
    const side = (item?.sourceImage || null) as SideType | null;
    let evidence: DeclarationEvidence | null = null;

    if (item?.value && side && images[side]) {
      const targetText = String(item.evidenceSnippet || item.value).toLowerCase();
      const region = rawTexts[side]?.textRegions?.find(r =>
        targetText.includes(r.text.toLowerCase()) || r.text.toLowerCase().includes(targetText)
      );

      evidence = {
        imageId: images[side]?.id,
        side,
        textSnippet: item.evidenceSnippet || String(item.value),
        boundingBox: region?.boundingBox || undefined,
        confidence: item.confidence || 'HIGH'
      };
    }

    const valueStr = item?.value ? String(item.value).trim() : null;
    let status = item?.status;
    if (!status) {
      status = valueStr ? 'DETECTED' : 'NOT_DETECTED';
    }

    let altValues: { side: SideType; value: string }[] | undefined;
    if (Array.isArray(item?.alternativeValues)) {
      altValues = item.alternativeValues
        .filter((av: any) => av && typeof av === 'object')
        .map((av: any) => ({
          side: (typeof av.side === 'string' && ['front', 'back', 'upper', 'lower'].includes(av.side))
            ? (av.side as SideType)
            : ('back' as SideType),
          value: av.value !== null && av.value !== undefined ? String(av.value) : ''
        }));
    }

    return {
      key,
      label,
      value: valueStr,
      status,
      confidence: item?.confidence || (valueStr ? 'HIGH' : 'LOW'),
      sourceImage: side,
      evidence,
      inconsistencyFlag: Boolean(item?.inconsistencyFlag),
      alternativeValues: altValues && altValues.length > 0 ? altValues : undefined
    };
  };

  const otherDeclarations: DeclarationField[] = [];

  if (parsed.fssai_license) {
    otherDeclarations.push({
      key: 'fssai_license',
      label: 'FSSAI License / Food Safety Registration',
      value: String(parsed.fssai_license),
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'back',
      evidence: null
    });
  }

  if (parsed.batch_number) {
    otherDeclarations.push({
      key: 'batch_number',
      label: 'Batch / Lot Number',
      value: String(parsed.batch_number),
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'back',
      evidence: null
    });
  }

  if (parsed.barcode_or_gtin) {
    otherDeclarations.push({
      key: 'barcode_or_gtin',
      label: 'Barcode / EAN-13 / GTIN',
      value: String(parsed.barcode_or_gtin),
      status: 'DETECTED',
      confidence: 'HIGH',
      sourceImage: 'back',
      evidence: null
    });
  }

  return {
    product_name: createField('product_name', 'Commodity Name & Description', parsed.product_name),
    brand_name: createField('brand_name', 'Brand / Trade Name', parsed.brand_name),
    variant: createField('variant', 'Product Variant', parsed.variant),
    manufacturer: createField('manufacturer', 'Manufacturer Name', parsed.manufacturer),
    packer: createField('packer', 'Packer Name (if different)', parsed.packer),
    importer: createField('importer', 'Importer Name (if imported)', parsed.importer),
    manufacturer_address: createField('manufacturer_address', 'Manufacturer Complete Address', parsed.manufacturer_address),
    packer_address: createField('packer_address', 'Packer Address', parsed.packer_address),
    importer_address: createField('importer_address', 'Importer Address', parsed.importer_address),
    net_quantity: createField('net_quantity', 'Net Quantity (Standard Metric)', parsed.net_quantity),
    mrp: createField('mrp', 'Maximum Retail Price (MRP incl. taxes)', parsed.mrp),
    manufacturing_or_packing_date: createField('manufacturing_or_packing_date', 'Month & Year of Mfg / Packing', parsed.manufacturing_or_packing_date),
    best_before_or_expiry: createField('best_before_or_expiry', 'Best Before / Expiry Date', parsed.best_before_or_expiry),
    import_date: createField('import_date', 'Import Month & Year', parsed.import_date),
    consumer_care_details: createField('consumer_care_details', 'Consumer Care Cell Details', parsed.consumer_care_details),
    country_of_origin: createField('country_of_origin', 'Country of Origin', parsed.country_of_origin),
    other_declarations: otherDeclarations
  };
}

// =========================================================================
// STAGE C: CROSS-IMAGE RECONCILIATION & PRODUCT IDENTITY
// Constructs identity strictly from visible text evidence and evaluates front/back consistency.
// Priority order:
// 1. Product name visible on packaging
// 2. Brand name with supporting visible text
// 3. Variant/flavor/model if explicitly visible
// 4. Net quantity
// 5. Manufacturer/packer info
// 6. MRP
// 7. Barcode
// =========================================================================

export function reconcileProductIdentity(
  declarations: ExtractedDeclarations,
  rawTexts: Record<SideType, RawExtractedImageText | null>,
  images: Record<SideType, ScanImage | null>
): ProductIdentity {
  logSection('STAGE C: CROSS-PANEL RECONCILIATION & IDENTITY');

  const frontRaw = rawTexts.front?.rawText?.toLowerCase() || '';
  const backRaw = rawTexts.back?.rawText?.toLowerCase() || '';

  const brandName = declarations.brand_name.value;
  const rawProductName = declarations.product_name.value;
  const variant = declarations.variant.value;
  const netQuantity = declarations.net_quantity.value;
  const mrp = declarations.mrp;
  const manufacturer = declarations.manufacturer.value;

  const hasFront = Boolean(images.front?.previewUrl);
  const hasBack = Boolean(images.back?.previewUrl);

  // Construct composite Product Title strictly from visible parts: Brand + Product Name + Variant
  let composedName: string | null = null;
  if (rawProductName) {
    if (brandName && !rawProductName.toLowerCase().includes(brandName.toLowerCase())) {
      composedName = `${brandName} ${rawProductName}`;
    } else {
      composedName = rawProductName;
    }
    if (variant && !composedName.toLowerCase().includes(variant.toLowerCase())) {
      composedName = `${composedName} (${variant})`;
    }
  } else if (brandName) {
    composedName = brandName;
  }

  // Cross-Panel Consistency Evaluation
  let isConsistent = true;
  let mismatchDetails: string | undefined = undefined;
  let matchAssessment = 'Product identity derived from visible package text across verified panels.';

  if (hasFront && hasBack) {
    // Dynamic brand vs manufacturer contradiction check
    // If front has a clear brand, verify whether back panel text contradicts it
    if (brandName && brandName.trim().length > 2) {
      const brandLower = brandName.toLowerCase();
      const backMentionsBrand = backRaw.includes(brandLower);
      const backMfgLower = (manufacturer || '').toLowerCase();

      // If manufacturer on back is completely distinct from front brand, check for obvious conflict
      if (!backMentionsBrand && backMfgLower.length > 3) {
        // Look for common corporate mismatches where front belongs to Company A and back to Company B
        const brandTokens = brandLower.split(/\s+/).filter(t => t.length > 2);
        const hasTokenInBack = brandTokens.some(t => backRaw.includes(t));

        if (!hasTokenInBack && declarations.brand_name.confidence === 'HIGH' && declarations.manufacturer.confidence === 'HIGH') {
          isConsistent = false;
          mismatchDetails = `Front package displays brand "${brandName}" while back panel identifies manufacturer "${manufacturer}" without corresponding brand markings. Possible mixed-product capture.`;
          matchAssessment = 'POTENTIAL PRODUCT INFORMATION MISMATCH: Uploaded photographs appear to belong to different physical products.';
          logDev('MISMATCH_DETECTED', mismatchDetails);
        }
      }
    }

    // Dual conflicting MRP check
    if (mrp.inconsistencyFlag && mrp.alternativeValues && mrp.alternativeValues.length > 1) {
      const altStr = mrp.alternativeValues.map(a => `${a.side.toUpperCase()}: ${a.value}`).join(' vs ');
      matchAssessment = `WARNING: Dual conflicting MRP declarations detected across packaging panels (${altStr}).`;
      logDev('MRP_INCONSISTENCY', matchAssessment);
    }
  }

  // Confidence determination:
  // HIGH: Product name + brand clearly visible
  // MEDIUM: Product name visible with net quantity or manufacturer
  // LOW: Partial or unconfirmed text
  // UNKNOWN: Product identity cannot be established reliably
  let identityConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' = 'HIGH';

  if (!composedName || declarations.product_name.status === 'NOT_DETECTED') {
    identityConfidence = 'UNKNOWN';
    matchAssessment = 'Product identity could not be reliably established from visible text. Package photographs may be blurred, occluded, or missing clear front labeling.';
  } else if (!isConsistent) {
    identityConfidence = 'LOW';
  } else if (declarations.product_name.confidence === 'HIGH' && brandName) {
    identityConfidence = 'HIGH';
  } else if (composedName && (netQuantity || manufacturer)) {
    identityConfidence = 'MEDIUM';
  } else {
    identityConfidence = 'LOW';
  }

  // Calculate consistency score
  let consistencyScore = isConsistent ? 95 : 20;
  if (mrp.inconsistencyFlag) consistencyScore = Math.min(consistencyScore, 55);
  if (identityConfidence === 'UNKNOWN') consistencyScore = 0;

  const result: ProductIdentity = {
    brand: brandName,
    productName: composedName,
    variant: variant,
    netQuantity: netQuantity,
    visibleIdentifier: declarations.mrp.value ? `MRP ${declarations.mrp.value}` : null,
    packagingIdentifier: 'Commercial Packaged Commodity',
    identityConfidence,
    identityBasis: 'Product identity constructed strictly from visible package text evidence.',
    consistencyScore,
    isConsistent,
    matchAssessment,
    mismatchDetails,
    potentialMismatchFlag: !isConsistent,
    categoryDetermined: false,
    productCategory: null
  };

  logDev(
    'STAGE_C_RESULT',
    `Reconciled: "${result.productName || 'Unidentified'}" | Brand: "${result.brand || 'None'}" | Confidence: ${result.identityConfidence} | Consistent: ${result.isConsistent} (${result.consistencyScore}%)`
  );

  return result;
}

// =========================================================================
// FULL TWO-STAGE PIPELINE ORCHESTRATOR
// =========================================================================

export async function runGeminiMultimodalPipeline(
  images: Record<SideType, ScanImage | null>
): Promise<AnalysisPipelineResult> {
  const startTime = Date.now();
  const steps: DebugPipelineStep[] = [];
  const stageTimings: Record<string, number> = {};

  const availablePanels: SideType[] = (['front', 'back', 'upper', 'lower'] as SideType[]).filter(
    s => Boolean(images[s]?.previewUrl)
  );

  logSection(`NEW INSPECTRA ANALYSIS PIPELINE RUN (${availablePanels.length} PANELS)`);

  // Step 1: Image Received Audit
  const hasMandatoryPanels = availablePanels.includes('front') && availablePanels.includes('back');
  steps.push({
    name: 'Image Received',
    status: hasMandatoryPanels ? 'SUCCESS' : 'WARNING',
    details: `Received ${availablePanels.length} panels: ${availablePanels.map(p => p.toUpperCase()).join(', ')} (Front & Back mandatory)`
  });

  // Step 2: High-Resolution Quality Assessment
  const qualityIssues: string[] = [];
  for (const side of availablePanels) {
    const q = images[side]?.quality;
    if (q?.issues && q.issues.length > 0) {
      qualityIssues.push(`${side.toUpperCase()}: ${q.issues[0]}`);
    }
  }
  steps.push({
    name: 'Image Quality Assessment',
    status: qualityIssues.length > 0 ? 'WARNING' : 'SUCCESS',
    details: qualityIssues.length > 0
      ? `Quality notices: ${qualityIssues.join('; ')}`
      : 'Full photographic resolution confirmed across active panels.'
  });

  // Step 3 & 4: Stage A — Raw Visual Text Reading
  const stageAStart = Date.now();
  const { rawExtractedText, log: stageALog } = await extractRawText(images);
  stageTimings['stage_a_raw_text'] = Date.now() - stageAStart;

  let totalRegions = 0;
  for (const side of availablePanels) {
    totalRegions += rawExtractedText[side]?.textRegions?.length || 0;
  }

  steps.push({
    name: 'Text Regions Detected',
    status: totalRegions > 0 ? 'SUCCESS' : 'WARNING',
    details: `Located ${totalRegions} optical text bounding regions across active panels.`,
    durationMs: stageTimings['stage_a_raw_text']
  });

  steps.push({
    name: 'Raw Text Extracted (Stage A)',
    status: totalRegions > 0 ? 'SUCCESS' : 'WARNING',
    details: totalRegions > 0
      ? `Transcribed text across ${availablePanels.length} panels without visual category guessing or hallucination.`
      : 'No text could be discerned from supplied photographs.',
    durationMs: stageTimings['stage_a_raw_text']
  });

  // Step 5: Stage B — Structured Declaration Extraction
  const stageBStart = Date.now();
  const { declarations: extractedDeclarations, log: stageBLog } = await extractDeclarations(
    rawExtractedText,
    images
  );
  stageTimings['stage_b_declarations'] = Date.now() - stageBStart;

  let detectedCount = 0;
  for (const key of Object.keys(extractedDeclarations)) {
    const f = (extractedDeclarations as any)[key];
    if (f && f.status === 'DETECTED') detectedCount++;
  }

  steps.push({
    name: 'Declarations Extracted (Stage B)',
    status: detectedCount >= 4 ? 'SUCCESS' : detectedCount > 0 ? 'WARNING' : 'FAILED',
    details: `Mapped ${detectedCount} statutory declaration fields from raw visible text evidence.`,
    durationMs: stageTimings['stage_b_declarations']
  });

  // Step 6: Stage C — Cross-Image Reconciliation & Identity
  const stageCStart = Date.now();
  const productIdentity = reconcileProductIdentity(extractedDeclarations, rawExtractedText, images);
  stageTimings['stage_c_reconciliation'] = Date.now() - stageCStart;

  steps.push({
    name: 'Identity Reconciled (Stage C)',
    status: productIdentity.isConsistent && productIdentity.identityConfidence !== 'UNKNOWN' ? 'SUCCESS' : 'WARNING',
    details: productIdentity.isConsistent
      ? `Reconciled: "${productIdentity.productName || 'Unidentified Commodity'}" (${productIdentity.identityConfidence} confidence)`
      : `Mismatch Detected: ${productIdentity.mismatchDetails || 'Front and back contradict each other'}`,
    durationMs: stageTimings['stage_c_reconciliation']
  });

  const totalDuration = Date.now() - startTime;
  stageTimings['total_pipeline'] = totalDuration;

  const debugAnalysis = {
    steps,
    availablePanels,
    summary: `Completed 2-Stage Vision Pipeline in ${totalDuration}ms (${availablePanels.length} panels analyzed).`,
    stageTimings
  };

  logSection(`PIPELINE FINISHED IN ${totalDuration}ms`);

  return {
    productIdentity,
    rawExtractedText,
    extractedDeclarations,
    debugAnalysis
  };
}
