import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AuditLogView } from './components/AuditLogView';
import { HowItWorksSection } from './components/HowItWorksSection';
import { IssueProductModal } from './components/IssueProductModal';
import { Navbar, type ActiveView } from './components/Navbar';
import { ProductImage } from './components/ProductImage';
import { RegistryView } from './components/RegistryView';
import { ReportCounterfeitModal } from './components/ReportCounterfeitModal';
import { VerificationResultCard } from './components/VerificationResultCard';
import { VerificationWorkbench } from './components/VerificationWorkbench';
import type {
  CounterfeitReport,
  ProductRecord,
  ScanLogEntry,
  VerificationEvaluation,
  VerificationMethod,
} from './utils/verification';

interface AuditSummary {
  totalProducts: number;
  totalScans: number;
  genuineScans: number;
  flaggedOrFakeScans: number;
  openReports: number;
}

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('verify');
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [scanLogs, setScanLogs] = useState<ScanLogEntry[]>([]);
  const [reports, setReports] = useState<CounterfeitReport[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary>({
    totalProducts: 0,
    totalScans: 0,
    genuineScans: 0,
    flaggedOrFakeScans: 0,
    openReports: 0,
  });
  const [auditLoading, setAuditLoading] = useState(true);

  const [evaluation, setEvaluation] = useState<VerificationEvaluation | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [initialCode, setInitialCode] = useState('');

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportPrefillSerial, setReportPrefillSerial] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = (await res.json()) as { products: ProductRecord[] };
        setProducts(data.products);
      }
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/audit');
      if (res.ok) {
        const data = (await res.json()) as {
          scanLogs: ScanLogEntry[];
          reports: CounterfeitReport[];
          summary: AuditSummary;
        };
        setScanLogs(data.scanLogs);
        setReports(data.reports);
        setAuditSummary(data.summary);
      }
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const handleVerify = useCallback(
    async (code: string, method: VerificationMethod) => {
      setIsVerifying(true);
      setVerifyError(null);
      try {
        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            method,
            location: 'Web Verification Portal',
          }),
        });
        const data = (await res.json()) as {
          evaluation?: VerificationEvaluation;
          error?: string;
        };
        if (!res.ok || !data.evaluation) {
          setVerifyError(data.error || 'Verification request failed.');
          return;
        }
        setEvaluation(data.evaluation);
        await Promise.all([fetchProducts(), fetchAudit()]);
        requestAnimationFrame(() => {
          document
            .querySelector('[data-testid="verification-result"]')
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      } catch {
        setVerifyError('Unable to reach verification ledger. Please retry.');
      } finally {
        setIsVerifying(false);
      }
    },
    [fetchAudit, fetchProducts]
  );

  useEffect(() => {
    void fetchProducts();
    void fetchAudit();

    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code') || params.get('serial');
    if (codeParam && codeParam.trim()) {
      setInitialCode(codeParam.trim());
      void handleVerify(codeParam.trim(), 'qr');
    }
  }, [fetchAudit, fetchProducts, handleVerify]);

  const handleNavigate = (view: ActiveView, sectionId?: string) => {
    setActiveView(view);
    if (sectionId) {
      requestAnimationFrame(() => {
        if (sectionId === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProductIssued = (product: ProductRecord) => {
    setProducts((prev) => [product, ...prev]);
    setSelectedProductId(product.id);
    setActiveView('registry');
    setStatusBanner(
      `Issued new serial ${product.serialNumber} for ${product.productName}. QR seal is ready for download.`
    );
    void fetchAudit();
  };

  const handleReportSubmitted = (report: CounterfeitReport) => {
    setReports((prev) => [report, ...prev]);
    setStatusBanner(
      `Counterfeit report logged for ${report.serialEntered} (${report.sellerName}).`
    );
    void fetchAudit();
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F2FAF9] text-[#082422]">
      <Navbar
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenIssueModal={() => setIssueModalOpen(true)}
      />

      {statusBanner && (
        <div
          role="status"
          className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-sm text-emerald-900"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{statusBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {activeView === 'verify' && (
          <>
            {/* Hero + Workbench */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-14 sm:pb-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                <div className="lg:col-span-7 flex flex-col justify-between gap-8">
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-teal-700">
                      Cryptographic Product Authentication
                    </p>
                    <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#082422] leading-[1.1] text-balance">
                      Verify whether a product is genuine or counterfeit in seconds.
                    </h1>
                    <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                      Enter a manufacturer serial number or scan the encrypted QR seal to confirm factory origin, batch provenance, and prior scan history.
                    </p>
                  </div>

                  <VerificationWorkbench
                    initialCode={initialCode}
                    isVerifying={isVerifying}
                    onVerify={handleVerify}
                  />
                </div>

                {/* Editorial Security Visual Panel */}
                <div className="lg:col-span-5 flex flex-col bg-white border border-[#CFE4E1] rounded-2xl overflow-hidden">
                  <div className="relative aspect-[4/3] lg:flex-1 bg-[#EBF5F3] overflow-hidden">
                    <ProductImage
                      imageKey="seal"
                      alt="Laser-etched brushed titanium authenticity tag with engraved QR matrix and serial number"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6 border-t border-[#CFE4E1] space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-medium text-slate-500">
                          Hardware-Bound Seal Standard
                        </div>
                        <div className="font-display text-base font-semibold text-[#082422] mt-0.5">
                          Dual-Factor Serial &amp; QR Verification
                        </div>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Every unit in the TrueVerify registry pairs a laser-etched serial number with a unique QR verification signature. Abnormal repeat scans across regions immediately trigger a clone alert.
                    </p>
                    <div className="pt-2 flex items-center justify-between border-t border-[#E6F2F0] text-xs">
                      <span className="font-mono text-slate-600 tabular-nums">
                        {products.length} registered units · {auditSummary.totalScans} logged scans
                      </span>
                      <button
                        type="button"
                        onClick={() => handleNavigate('registry')}
                        className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                      >
                        <span>Browse Registry</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {verifyError && (
                <div
                  role="alert"
                  className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800"
                >
                  {verifyError}
                </div>
              )}

              {/* Live Verification Verdict */}
              {(isVerifying || evaluation) && (
                <div className="mt-8">
                  <VerificationResultCard
                    evaluation={evaluation}
                    isVerifying={isVerifying}
                    onReportCounterfeit={(serial) => {
                      setReportPrefillSerial(serial);
                      setReportModalOpen(true);
                    }}
                  />
                </div>
              )}
            </section>

            <HowItWorksSection />
          </>
        )}

        {activeView === 'registry' && (
          <RegistryView
            products={products}
            isLoading={productsLoading}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
            onOpenIssueModal={() => setIssueModalOpen(true)}
            onVerifyQrPayload={(payload) => {
              setActiveView('verify');
              void handleVerify(payload, 'qr');
            }}
          />
        )}

        {activeView === 'audit' && (
          <AuditLogView
            scanLogs={scanLogs}
            reports={reports}
            summary={auditSummary}
            isLoading={auditLoading}
            onOpenReportModal={(prefill = '') => {
              setReportPrefillSerial(prefill);
              setReportModalOpen(true);
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1">
            <div className="font-display text-sm font-bold text-slate-900">TrueVerify</div>
            <div>Cryptographic serial &amp; QR code product authentication ledger.</div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => handleNavigate('verify', 'workbench')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Verify Product
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('registry')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Product Registry
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('audit')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Audit Log
            </button>
            <button
              type="button"
              onClick={() => {
                setReportPrefillSerial('');
                setReportModalOpen(true);
              }}
              className="hover:text-slate-900 cursor-pointer"
            >
              Report Counterfeit
            </button>
          </div>
        </div>
      </footer>

      <IssueProductModal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        onIssued={handleProductIssued}
      />

      <ReportCounterfeitModal
        isOpen={reportModalOpen}
        initialSerial={reportPrefillSerial}
        onClose={() => setReportModalOpen(false)}
        onSubmitted={handleReportSubmitted}
      />
    </div>
  );
}
