import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Flag,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { ProductImage } from './ProductImage';
import { downloadDataUrl, generateQrDataUrl } from '../utils/qrClient';
import {
  buildQrVerificationPayload,
  type VerificationEvaluation,
} from '../utils/verification';

interface VerificationResultCardProps {
  evaluation: VerificationEvaluation | null;
  isVerifying: boolean;
  onReportCounterfeit: (prefillSerial: string) => void;
}

export function VerificationResultCard({
  evaluation,
  isVerifying,
  onReportCounterfeit,
}: VerificationResultCardProps) {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setQrModalOpen(false);
    setQrDataUrl(null);
    if (evaluation?.matchedProduct) {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const payload = buildQrVerificationPayload(evaluation.matchedProduct.serialNumber, origin);
      generateQrDataUrl(payload, 260)
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    }
  }, [evaluation]);

  if (isVerifying) {
    return (
      <div
        aria-live="polite"
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 animate-pulse"
      >
        <div className="h-6 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-full max-w-md bg-slate-100 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="h-24 bg-slate-100 rounded-xl" />
          <div className="h-24 bg-slate-100 rounded-xl" />
          <div className="h-24 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return null;
  }

  const product = evaluation.matchedProduct;

  const outcomeStyles = {
    authentic: {
      container: 'border-emerald-200 bg-white',
      banner: 'bg-emerald-50 border-b border-emerald-200 text-emerald-950',
      icon: ShieldCheck,
      iconColor: 'text-emerald-700',
      statusLabel: 'Genuine Product Confirmed',
    },
    cloned_warning: {
      container: 'border-red-300 bg-white',
      banner: 'bg-red-50 border-b border-red-200 text-red-950',
      icon: ShieldAlert,
      iconColor: 'text-red-700',
      statusLabel: 'Counterfeit Risk — Cloned Serial',
    },
    recalled_warning: {
      container: 'border-amber-300 bg-white',
      banner: 'bg-amber-50 border-b border-amber-200 text-amber-950',
      icon: AlertTriangle,
      iconColor: 'text-amber-700',
      statusLabel: 'Batch Safety Recall Active',
    },
    counterfeit_unregistered: {
      container: 'border-red-300 bg-white',
      banner: 'bg-red-50 border-b border-red-200 text-red-950',
      icon: ShieldX,
      iconColor: 'text-red-700',
      statusLabel: 'Counterfeit Warning — Unregistered',
    },
  }[evaluation.outcome];

  const StatusIcon = outcomeStyles.icon;

  return (
    <section
      aria-live="polite"
      aria-label="Verification result"
      data-testid="verification-result"
      data-outcome={evaluation.outcome}
      className={`rounded-2xl border overflow-hidden ${outcomeStyles.container}`}
    >
      {/* Status Banner */}
      <div className={`px-6 py-5 flex flex-wrap items-center justify-between gap-4 ${outcomeStyles.banner}`}>
        <div className="flex items-start gap-3.5">
          <StatusIcon className={`w-6 h-6 mt-0.5 shrink-0 ${outcomeStyles.iconColor}`} />
          <div>
            <div className="text-xs font-semibold tracking-wide uppercase opacity-80">
              {outcomeStyles.statusLabel} · Method: {evaluation.method === 'qr' ? 'QR Scan' : 'Serial Lookup'}
            </div>
            <h3 className="font-display text-xl font-bold mt-0.5">
              {evaluation.headline}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {product && qrDataUrl && (
            <button
              type="button"
              onClick={() => setQrModalOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{qrModalOpen ? 'Hide QR Seal' : 'Show QR Seal'}</span>
            </button>
          )}
          {!evaluation.isGenuine && (
            <button
              type="button"
              onClick={() => onReportCounterfeit(evaluation.resolvedSerial)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-red-700 hover:bg-red-800 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report Counterfeit</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Verdict Body */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-sm sm:text-base text-slate-800 leading-relaxed">
            {evaluation.summary}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {evaluation.recommendation}
          </p>
        </div>

        {evaluation.riskFlags.length > 0 && (
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="text-xs font-semibold text-slate-900">
              Detected Verification Anomalies
            </div>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {evaluation.riskFlags.map((flag) => (
                <li key={flag} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {qrModalOpen && qrDataUrl && product && (
          <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-5">
            <img
              src={qrDataUrl}
              alt={`Cryptographic QR seal for ${product.serialNumber}`}
              className="w-32 h-32 rounded-lg border border-slate-200 bg-white p-1"
            />
            <div className="space-y-2 text-center sm:text-left">
              <div className="text-sm font-semibold text-slate-900">
                Cryptographic QR Authenticity Seal
              </div>
              <div className="text-xs font-mono text-slate-600">
                Serial: {product.serialNumber} · Digest: {product.cryptographicDigest}
              </div>
              <button
                type="button"
                onClick={() => downloadDataUrl(qrDataUrl, `${product.serialNumber}-seal.png`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR Seal PNG</span>
              </button>
            </div>
          </div>
        )}

        {product ? (
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <ProductImage
                  imageKey={product.imageKey}
                  alt={`${product.brand} ${product.productName}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {product.brand} · {product.category}
              </div>
              <div className="font-display text-lg font-semibold text-slate-900 mt-0.5">
                {product.productName}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              {/* Cryptographic Metadata Grid */}
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-xs text-slate-500">Serial Number</dt>
                  <dd className="font-mono text-sm font-semibold text-slate-900 mt-0.5 tabular-nums">
                    {product.serialNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Model SKU</dt>
                  <dd className="font-mono text-sm text-slate-900 mt-0.5">
                    {product.modelSku}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Batch Code</dt>
                  <dd className="font-mono text-sm text-slate-900 mt-0.5">
                    {product.batchCode}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Origin Facility</dt>
                  <dd className="text-sm text-slate-900 mt-0.5">
                    {product.originFacility}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Manufactured</dt>
                  <dd className="font-mono text-sm text-slate-900 mt-0.5 tabular-nums">
                    {product.manufacturedDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Recorded Verifications</dt>
                  <dd className="font-mono text-sm font-semibold text-slate-900 mt-0.5 tabular-nums">
                    {product.scanCount} {product.scanCount === 1 ? 'scan' : 'scans'}
                  </dd>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-xs text-slate-500">Cryptographic Ledger Digest</dt>
                  <dd className="font-mono text-xs text-slate-700 mt-0.5 break-all">
                    {product.cryptographicDigest}
                  </dd>
                </div>
              </dl>

              {/* Provenance Timeline */}
              {product.provenanceSteps.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-900 mb-3">
                    Verified Supply-Chain Custody
                  </div>
                  <ol className="space-y-3">
                    {product.provenanceSteps.map((step, idx) => (
                      <li
                        key={`${step.stage}-${idx}`}
                        className="flex items-start justify-between gap-4 text-sm"
                      >
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-900">{step.stage}</div>
                            <div className="text-xs text-slate-500">
                              {step.location} · {step.verifier}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                          {step.timestamp}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold text-slate-900 mb-2">
                Submitted Identifier
              </div>
              <div className="font-mono text-sm font-semibold text-red-800 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 inline-block">
                {evaluation.resolvedSerial}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 mb-2">
                Recommended Physical Checks
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li>Inspect laser-etched chassis serial against box label for mismatches.</li>
                <li>Check for low-resolution adhesive QR stickers placed over original seals.</li>
                <li>Request an authorized dealer invoice before transferring payment.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
