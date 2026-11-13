import fs from 'fs';
import path from 'path';
import {
  computeCryptographicDigest,
  evaluateProductVerification,
  generateSerialNumber,
  type CounterfeitReport,
  type NewProductInput,
  type NewReportInput,
  type ProductRecord,
  type ScanLogEntry,
  type VerificationEvaluation,
  type VerificationMethod,
} from '../utils/verification';
import { SEED_PRODUCTS, SEED_REPORTS, SEED_SCAN_LOGS } from './seedData';

interface DatabaseState {
  products: ProductRecord[];
  scanLogs: ScanLogEntry[];
  reports: CounterfeitReport[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'trueverify-db.json');

function ensureDbLoaded(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial: DatabaseState = {
        products: structuredClone(SEED_PRODUCTS),
        scanLogs: structuredClone(SEED_SCAN_LOGS),
        reports: structuredClone(SEED_REPORTS),
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseState;
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.scanLogs) || !Array.isArray(parsed.reports)) {
      throw new Error('Corrupt DB structure');
    }
    return parsed;
  } catch {
    const fallback: DatabaseState = {
      products: structuredClone(SEED_PRODUCTS),
      scanLogs: structuredClone(SEED_SCAN_LOGS),
      reports: structuredClone(SEED_REPORTS),
    };
    return fallback;
  }
}

function saveDb(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function listProducts(query?: string, statusFilter?: string): ProductRecord[] {
  const db = ensureDbLoaded();
  const q = (query || '').trim().toLowerCase();
  const status = (statusFilter || 'all').trim().toLowerCase();

  return db.products.filter((product) => {
    const matchesStatus = status === 'all' || product.status === status;
    const matchesQuery =
      !q ||
      product.serialNumber.toLowerCase().includes(q) ||
      product.brand.toLowerCase().includes(q) ||
      product.productName.toLowerCase().includes(q) ||
      product.batchCode.toLowerCase().includes(q) ||
      product.modelSku.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });
}

export function createProduct(input: NewProductInput): ProductRecord {
  const db = ensureDbLoaded();
  const serialNumber = generateSerialNumber(
    input.brand,
    input.category,
    db.products.map((p) => p.serialNumber)
  );
  const today = new Date().toISOString().slice(0, 10);
  const newProduct: ProductRecord = {
    id: `prod-${Date.now()}`,
    serialNumber,
    brand: input.brand.trim(),
    productName: input.productName.trim(),
    modelSku: input.modelSku.trim().toUpperCase(),
    category: input.category.trim(),
    batchCode: input.batchCode.trim().toUpperCase(),
    manufacturedDate: today,
    originFacility: input.originFacility.trim(),
    warrantyMonths: Number(input.warrantyMonths),
    status: 'authentic',
    scanCount: 0,
    lastScannedAt: null,
    lastScanLocation: null,
    imageKey: input.imageKey ?? 'seal',
    cryptographicDigest: computeCryptographicDigest(serialNumber, input.batchCode),
    provenanceSteps: [
      {
        stage: 'Serial & QR Seal Issued',
        location: input.originFacility.trim(),
        timestamp: today,
        verifier: 'TrueVerify Brand Registry',
      },
      {
        stage: 'Cryptographic Ledger Anchored',
        location: 'TrueVerify Verification Network',
        timestamp: today,
        verifier: 'HSM Signer',
      },
    ],
  };

  db.products.unshift(newProduct);
  saveDb(db);
  return newProduct;
}

export function verifyCodeAndRecord(
  code: string,
  method: VerificationMethod,
  location: string = 'Web Verification Portal'
): VerificationEvaluation {
  const db = ensureDbLoaded();
  const nowIso = new Date().toISOString();
  const evaluation = evaluateProductVerification(code, method, db.products, nowIso);

  if (evaluation.matchedProduct) {
    const idx = db.products.findIndex((p) => p.id === evaluation.matchedProduct!.id);
    if (idx !== -1) {
      const updated = {
        ...db.products[idx],
        scanCount: db.products[idx].scanCount + 1,
        lastScannedAt: nowIso,
        lastScanLocation: location.trim() || 'Web Verification Portal',
      };
      db.products[idx] = updated;
      evaluation.matchedProduct = updated;
    }
  }

  const logEntry: ScanLogEntry = {
    id: `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: nowIso,
    submittedCode: code.trim(),
    resolvedSerial: evaluation.resolvedSerial || null,
    method,
    outcome: evaluation.outcome,
    location: location.trim() || 'Web Verification Portal',
    brand: evaluation.matchedProduct?.brand ?? null,
    productName: evaluation.matchedProduct?.productName ?? null,
  };

  db.scanLogs.unshift(logEntry);
  if (db.scanLogs.length > 100) {
    db.scanLogs = db.scanLogs.slice(0, 100);
  }
  saveDb(db);
  return evaluation;
}

export function getAuditData() {
  const db = ensureDbLoaded();
  const totalProducts = db.products.length;
  const totalScans = db.scanLogs.length;
  const genuineScans = db.scanLogs.filter((s) => s.outcome === 'authentic').length;
  const flaggedOrFakeScans = db.scanLogs.filter((s) => s.outcome !== 'authentic').length;

  return {
    scanLogs: db.scanLogs,
    reports: db.reports,
    summary: {
      totalProducts,
      totalScans,
      genuineScans,
      flaggedOrFakeScans,
      openReports: db.reports.length,
    },
  };
}

export function createCounterfeitReport(input: NewReportInput): CounterfeitReport {
  const db = ensureDbLoaded();
  const report: CounterfeitReport = {
    id: `rep-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    serialEntered: input.serialEntered.trim().toUpperCase(),
    sellerName: input.sellerName.trim(),
    purchaseChannel: input.purchaseChannel.trim() || 'Online Marketplace',
    cityRegion: input.cityRegion.trim(),
    notes: input.notes.trim(),
    status: 'open',
  };
  db.reports.unshift(report);
  saveDb(db);
  return report;
}
