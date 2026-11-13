export type ProductStatus = 'authentic' | 'flagged_cloned' | 'recalled';

export type VerificationOutcome =
  | 'authentic'
  | 'cloned_warning'
  | 'recalled_warning'
  | 'counterfeit_unregistered';

export type VerificationMethod = 'serial' | 'qr';

export type ProductImageKey = 'watch' | 'headphones' | 'serum' | 'seal';

export interface ProvenanceStep {
  stage: string;
  location: string;
  timestamp: string;
  verifier: string;
}

export interface ProductRecord {
  id: string;
  serialNumber: string;
  brand: string;
  productName: string;
  modelSku: string;
  category: string;
  batchCode: string;
  manufacturedDate: string;
  originFacility: string;
  warrantyMonths: number;
  status: ProductStatus;
  statusNote?: string;
  scanCount: number;
  lastScannedAt: string | null;
  lastScanLocation: string | null;
  imageKey: ProductImageKey;
  cryptographicDigest: string;
  provenanceSteps: ProvenanceStep[];
}

export interface ScanLogEntry {
  id: string;
  timestamp: string;
  submittedCode: string;
  resolvedSerial: string | null;
  method: VerificationMethod;
  outcome: VerificationOutcome;
  location: string;
  brand: string | null;
  productName: string | null;
}

export interface CounterfeitReport {
  id: string;
  submittedAt: string;
  serialEntered: string;
  sellerName: string;
  purchaseChannel: string;
  cityRegion: string;
  notes: string;
  status: 'open' | 'investigating' | 'confirmed_fake';
}

export interface NewProductInput {
  brand: string;
  productName: string;
  modelSku: string;
  category: string;
  batchCode: string;
  originFacility: string;
  warrantyMonths: number;
  imageKey?: ProductImageKey;
}

export interface NewReportInput {
  serialEntered: string;
  sellerName: string;
  purchaseChannel: string;
  cityRegion: string;
  notes: string;
}

export interface VerificationEvaluation {
  outcome: VerificationOutcome;
  isGenuine: boolean;
  headline: string;
  summary: string;
  recommendation: string;
  resolvedSerial: string;
  method: VerificationMethod;
  verifiedAt: string;
  matchedProduct: ProductRecord | null;
  riskFlags: string[];
}

const CLONE_SCAN_THRESHOLD = 15;

export function normalizeSerialInput(raw: string): string {
  return raw
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function extractSerialFromQrPayload(payload: string): string | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;

  // 1. JSON encoded QR payload: {"serial":"TV-2026-8841-CH", ...}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as { serial?: string; code?: string };
      const candidate = parsed.serial ?? parsed.code;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return normalizeSerialInput(candidate);
      }
    } catch {
      // Continue to other formats
    }
  }

  // 2. URL payload: https://.../verify?code=TV-2026-8841-CH or ?serial=...
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const param = url.searchParams.get('code') || url.searchParams.get('serial');
      if (param && param.trim().length > 0) {
        return normalizeSerialInput(param);
      }
      const segments = url.pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && /^TV-/i.test(lastSegment)) {
        return normalizeSerialInput(lastSegment);
      }
    } catch {
      // Fallback to raw extraction
    }
  }

  // 3. Prefixed protocol token: TV:VER1:TV-2026-8841-CH or TRUEVERIFY:TV-2026-8841-CH
  if (/^(TV:VER\d+:|TRUEVERIFY:)/i.test(trimmed)) {
    const parts = trimmed.split(':');
    const last = parts[parts.length - 1];
    return last ? normalizeSerialInput(last) : null;
  }

  // 4. Plain serial string
  return normalizeSerialInput(trimmed);
}

export function buildQrVerificationPayload(serialNumber: string, origin?: string): string {
  const cleanSerial = normalizeSerialInput(serialNumber);
  if (origin && /^https?:\/\//i.test(origin)) {
    return `${origin.replace(/\/$/, '')}/?code=${encodeURIComponent(cleanSerial)}`;
  }
  return `TV:VER1:${cleanSerial}`;
}

export function computeCryptographicDigest(serialNumber: string, batchCode: string): string {
  const input = `${normalizeSerialInput(serialNumber)}|${batchCode.trim().toUpperCase()}|TRUEVERIFY-LEDGER`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= code + ((h2 << 6) >>> 0) + (h2 >>> 2);
    h2 = h2 >>> 0;
  }
  const part1 = h1.toString(16).padStart(8, '0').toUpperCase();
  const part2 = h2.toString(16).padStart(8, '0').toUpperCase();
  const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `${part1}-${part2}-${part3}`;
}

export function generateSerialNumber(
  brand: string,
  category: string,
  existingSerials: string[] = [],
  seed?: number
): string {
  const year = new Date().getFullYear();
  const brandCode = brand
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, 'X');
  const catCode = category
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, 'G');

  const existingSet = new Set(existingSerials.map((s) => normalizeSerialInput(s)));
  let attempt = 0;
  while (attempt < 50) {
    const numeric =
      seed !== undefined && attempt === 0
        ? String(Math.abs(seed) % 10000).padStart(4, '0')
        : String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `TV-${year}-${numeric}-${brandCode}${catCode}`.slice(0, 17);
    const formatted = `TV-${year}-${numeric}-${brandCode}`;
    if (!existingSet.has(formatted) && !existingSet.has(candidate)) {
      return formatted;
    }
    attempt++;
  }
  return `TV-${year}-${Date.now().toString().slice(-4)}-${brandCode}`;
}

export function evaluateProductVerification(
  inputCode: string,
  method: VerificationMethod,
  products: ProductRecord[],
  nowIso: string = new Date().toISOString()
): VerificationEvaluation {
  const resolvedSerial =
    method === 'qr'
      ? extractSerialFromQrPayload(inputCode) ?? normalizeSerialInput(inputCode)
      : normalizeSerialInput(inputCode);

  if (!resolvedSerial) {
    return {
      outcome: 'counterfeit_unregistered',
      isGenuine: false,
      headline: 'Invalid Verification Code',
      summary: 'No serial number or QR payload was provided.',
      recommendation: 'Enter a valid serial number or scan the product QR seal.',
      resolvedSerial: '',
      method,
      verifiedAt: nowIso,
      matchedProduct: null,
      riskFlags: ['Empty or unreadable code payload'],
    };
  }

  const matched =
    products.find((p) => normalizeSerialInput(p.serialNumber) === resolvedSerial) ?? null;

  if (!matched) {
    return {
      outcome: 'counterfeit_unregistered',
      isGenuine: false,
      headline: 'Unregistered Serial — Potential Counterfeit',
      summary: `No authentic record matching "${resolvedSerial}" exists in the TrueVerify manufacturer ledger.`,
      recommendation:
        'Do not complete purchase or accept this item as genuine. Inspect packaging seals and submit a counterfeit report with seller details.',
      resolvedSerial,
      method,
      verifiedAt: nowIso,
      matchedProduct: null,
      riskFlags: [
        'Serial number absent from authorized manufacturer registry',
        'No cryptographic batch signature found',
        method === 'qr' ? 'QR payload does not match any issued tag' : 'Manual serial lookup failed',
      ],
    };
  }

  if (matched.status === 'flagged_cloned' || matched.scanCount >= CLONE_SCAN_THRESHOLD) {
    return {
      outcome: 'cloned_warning',
      isGenuine: false,
      headline: 'Suspected Clone — Anomalous Scan Activity',
      summary:
        matched.statusNote ||
        `Serial "${matched.serialNumber}" has been scanned ${matched.scanCount} times across dispersed locations, indicating potential label duplication.`,
      recommendation:
        'Verify physical laser-etched chassis markings against the registered model specs below, or report this seller immediately.',
      resolvedSerial,
      method,
      verifiedAt: nowIso,
      matchedProduct: matched,
      riskFlags: [
        `Excessive verification frequency (${matched.scanCount} recorded scans)`,
        'Geographic scan velocity exceeds single-owner threshold',
        'High risk of duplicated QR or counterfeit tag cloning',
      ],
    };
  }

  if (matched.status === 'recalled') {
    return {
      outcome: 'recalled_warning',
      isGenuine: false,
      headline: 'Genuine Origin — Active Batch Safety Recall',
      summary:
        matched.statusNote ||
        `Batch ${matched.batchCode} for ${matched.productName} is subject to an active manufacturer safety recall.`,
      recommendation:
        'Discontinue use immediately and contact the manufacturer authorized service desk for a replacement unit.',
      resolvedSerial,
      method,
      verifiedAt: nowIso,
      matchedProduct: matched,
      riskFlags: [
        `Batch ${matched.batchCode} flagged for mandatory recall`,
        'Manufacturer service replacement required',
      ],
    };
  }

  const nextCount = matched.scanCount + 1;
  return {
    outcome: 'authentic',
    isGenuine: true,
    headline: 'Verified Genuine Product',
    summary: `Cryptographic serial "${matched.serialNumber}" matches an authentic ${matched.brand} unit manufactured at ${matched.originFacility}.`,
    recommendation:
      nextCount === 1
        ? 'First-time consumer verification confirmed. Retain this certificate for warranty coverage.'
        : `Authenticated (${nextCount} total verifications recorded, within normal ownership threshold).`,
    resolvedSerial,
    method,
    verifiedAt: nowIso,
    matchedProduct: matched,
    riskFlags: [],
  };
}

export function validateNewProductInput(input: NewProductInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.brand.trim()) errors.brand = 'Brand name is required.';
  if (!input.productName.trim()) errors.productName = 'Product name is required.';
  if (!input.modelSku.trim()) errors.modelSku = 'Model SKU is required.';
  if (!input.category.trim()) errors.category = 'Category is required.';
  if (!input.batchCode.trim()) errors.batchCode = 'Batch code is required.';
  if (!input.originFacility.trim()) errors.originFacility = 'Origin facility is required.';
  if (!Number.isFinite(input.warrantyMonths) || input.warrantyMonths < 0 || input.warrantyMonths > 240) {
    errors.warrantyMonths = 'Warranty must be between 0 and 240 months.';
  }
  return errors;
}

export function validateCounterfeitReportInput(input: NewReportInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.serialEntered.trim()) errors.serialEntered = 'Serial or QR code is required.';
  if (!input.sellerName.trim()) errors.sellerName = 'Seller or marketplace name is required.';
  if (!input.cityRegion.trim()) errors.cityRegion = 'City or region is required.';
  if (!input.notes.trim() || input.notes.trim().length < 8) {
    errors.notes = 'Please provide at least 8 characters describing the discrepancy.';
  }
  return errors;
}
