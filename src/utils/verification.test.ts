import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQrVerificationPayload,
  computeCryptographicDigest,
  evaluateProductVerification,
  extractSerialFromQrPayload,
  generateSerialNumber,
  normalizeSerialInput,
  validateCounterfeitReportInput,
  validateNewProductInput,
  type ProductRecord,
} from './verification';

const SAMPLE_PRODUCTS: ProductRecord[] = [
  {
    id: 'prod-1',
    serialNumber: 'TV-2026-8841-CH',
    brand: 'Aethereal Horology',
    productName: 'Chronograph Calibre 04',
    modelSku: 'AE-CH04-ST',
    category: 'Watches',
    batchCode: 'BATCH-CH-26A',
    manufacturedDate: '2026-02-14',
    originFacility: 'Geneva Atelier, Switzerland',
    warrantyMonths: 60,
    status: 'authentic',
    scanCount: 2,
    lastScannedAt: '2026-10-01T10:00:00.000Z',
    lastScanLocation: 'Zurich, CH',
    imageKey: 'watch',
    cryptographicDigest: 'A1B2C3D4-E5F60718-99AABBCC',
    provenanceSteps: [],
  },
  {
    id: 'prod-2',
    serialNumber: 'TV-2025-4410-CL',
    brand: 'Aethereal Horology',
    productName: 'Tourbillon Heritage Edition',
    modelSku: 'AE-TH01-TI',
    category: 'Watches',
    batchCode: 'BATCH-TH-25C',
    manufacturedDate: '2025-08-19',
    originFacility: 'Geneva Atelier, Switzerland',
    warrantyMonths: 60,
    status: 'flagged_cloned',
    statusNote: 'Serial flagged after 47 scans across 6 countries in 48 hours.',
    scanCount: 47,
    lastScannedAt: '2026-11-12T18:20:00.000Z',
    lastScanLocation: 'Multiple Regions',
    imageKey: 'watch',
    cryptographicDigest: '11223344-55667788-9900AABB',
    provenanceSteps: [],
  },
  {
    id: 'prod-3',
    serialNumber: 'TV-2025-1904-RC',
    brand: 'Veloce Carbon',
    productName: 'AeroPro MIPS Helmet',
    modelSku: 'VC-AP-25',
    category: 'Protective Gear',
    batchCode: 'BATCH-VC-25M',
    manufacturedDate: '2025-05-03',
    originFacility: 'Treviso Composite Works, Italy',
    warrantyMonths: 24,
    status: 'recalled',
    statusNote: 'Voluntary batch safety recall issued for chinstrap latch inspection.',
    scanCount: 1,
    lastScannedAt: '2026-06-15T09:12:00.000Z',
    lastScanLocation: 'Milan, IT',
    imageKey: 'seal',
    cryptographicDigest: 'CAFEBABE-12345678-90ABCDEF',
    provenanceSteps: [],
  },
];

test('normalizeSerialInput normalizes case, whitespace, and unicode hyphens', () => {
  assert.equal(normalizeSerialInput(' tv\u20132026\u20148841 ch '), 'TV-2026-8841CH');
  assert.equal(normalizeSerialInput('  tv-2026-8841-ch  '), 'TV-2026-8841-CH');
});

test('extractSerialFromQrPayload extracts serials from URLs, JSON, prefixed tokens, and raw strings', () => {
  assert.equal(
    extractSerialFromQrPayload('https://trueverify.app/?code=tv-2026-8841-ch'),
    'TV-2026-8841-CH'
  );
  assert.equal(
    extractSerialFromQrPayload('https://trueverify.app/verify/TV-2026-8841-CH'),
    'TV-2026-8841-CH'
  );
  assert.equal(
    extractSerialFromQrPayload('{"serial":"tv-2026-8841-ch","v":1}'),
    'TV-2026-8841-CH'
  );
  assert.equal(extractSerialFromQrPayload('TV:VER1:tv-2026-8841-ch'), 'TV-2026-8841-CH');
  assert.equal(extractSerialFromQrPayload('TV-2026-8841-CH'), 'TV-2026-8841-CH');
  assert.equal(extractSerialFromQrPayload('   '), null);
});

test('buildQrVerificationPayload formats canonical URL or protocol string', () => {
  assert.equal(
    buildQrVerificationPayload('tv-2026-8841-ch', 'https://example.com/'),
    'https://example.com/?code=TV-2026-8841-CH'
  );
  assert.equal(buildQrVerificationPayload('tv-2026-8841-ch'), 'TV:VER1:TV-2026-8841-CH');
});

test('evaluateProductVerification identifies authentic, cloned, recalled, and counterfeit codes', () => {
  const authentic = evaluateProductVerification('tv-2026-8841-ch', 'serial', SAMPLE_PRODUCTS);
  assert.equal(authentic.outcome, 'authentic');
  assert.equal(authentic.isGenuine, true);
  assert.equal(authentic.matchedProduct?.id, 'prod-1');

  const cloned = evaluateProductVerification(
    'https://trueverify.app/?code=TV-2025-4410-CL',
    'qr',
    SAMPLE_PRODUCTS
  );
  assert.equal(cloned.outcome, 'cloned_warning');
  assert.equal(cloned.isGenuine, false);
  assert.ok(cloned.riskFlags.length > 0);

  const recalled = evaluateProductVerification('TV-2025-1904-RC', 'serial', SAMPLE_PRODUCTS);
  assert.equal(recalled.outcome, 'recalled_warning');
  assert.equal(recalled.isGenuine, false);

  const fake = evaluateProductVerification('FAKE-9999-ZZ', 'serial', SAMPLE_PRODUCTS);
  assert.equal(fake.outcome, 'counterfeit_unregistered');
  assert.equal(fake.isGenuine, false);
  assert.equal(fake.matchedProduct, null);
});

test('generateSerialNumber avoids collisions and computeCryptographicDigest is deterministic', () => {
  const existing = ['TV-2026-1234-KL'];
  const generated = generateSerialNumber('Klangwerk', 'Audio', existing, 1234);
  assert.notEqual(generated, 'TV-2026-1234-KL');
  assert.match(generated, /^TV-\d{4}-\d{4}-KL$/);

  const d1 = computeCryptographicDigest('TV-2026-8841-CH', 'BATCH-CH-26A');
  const d2 = computeCryptographicDigest('tv-2026-8841-ch', 'batch-ch-26a');
  assert.equal(d1, d2);
  assert.match(d1, /^[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/);
});

test('form validators catch empty required fields', () => {
  const prodErrors = validateNewProductInput({
    brand: '',
    productName: '',
    modelSku: '',
    category: '',
    batchCode: '',
    originFacility: '',
    warrantyMonths: -1,
  });
  assert.ok(prodErrors.brand);
  assert.ok(prodErrors.productName);
  assert.ok(prodErrors.warrantyMonths);

  const reportErrors = validateCounterfeitReportInput({
    serialEntered: '',
    sellerName: '',
    purchaseChannel: 'Marketplace',
    cityRegion: '',
    notes: 'short',
  });
  assert.ok(reportErrors.serialEntered);
  assert.ok(reportErrors.sellerName);
  assert.ok(reportErrors.cityRegion);
  assert.ok(reportErrors.notes);
});
