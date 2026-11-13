import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  QrCode,
  Search,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import type {
  CounterfeitReport,
  ScanLogEntry,
  VerificationOutcome,
} from '../utils/verification';

interface AuditSummary {
  totalProducts: number;
  totalScans: number;
  genuineScans: number;
  flaggedOrFakeScans: number;
  openReports: number;
}

interface AuditLogViewProps {
  scanLogs: ScanLogEntry[];
  reports: CounterfeitReport[];
  summary: AuditSummary;
  isLoading: boolean;
  onOpenReportModal: (prefillSerial?: string) => void;
}

const OUTCOME_DISPLAY: Record<
  VerificationOutcome,
  { label: string; colorClass: string; Icon: typeof CheckCircle2 }
> = {
  authentic: {
    label: 'Authentic',
    colorClass: 'text-emerald-800',
    Icon: CheckCircle2,
  },
  cloned_warning: {
    label: 'Cloned Alert',
    colorClass: 'text-red-700',
    Icon: ShieldAlert,
  },
  recalled_warning: {
    label: 'Recalled Batch',
    colorClass: 'text-amber-700',
    Icon: AlertTriangle,
  },
  counterfeit_unregistered: {
    label: 'Unregistered / Fake',
    colorClass: 'text-red-700',
    Icon: ShieldX,
  },
};

export function AuditLogView({
  scanLogs,
  reports,
  summary,
  isLoading,
  onOpenReportModal,
}: AuditLogViewProps) {
  const [activeTab, setActiveTab] = useState<'scans' | 'reports'>('scans');

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Verification Audit &amp; Counterfeit Reports
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Live ledger of serial lookups, QR seal scans, and buyer-submitted counterfeit alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenReportModal('')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Flag className="w-4 h-4" />
          <span>File Counterfeit Report</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Registered Units</div>
          <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {summary.totalProducts}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Logged Verifications</div>
          <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {summary.totalScans}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Genuine Confirmations</div>
          <div className="font-mono text-2xl font-bold text-emerald-800 mt-1 tabular-nums">
            {summary.genuineScans}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Counterfeit &amp; Clone Alerts</div>
          <div className="font-mono text-2xl font-bold text-red-700 mt-1 tabular-nums">
            {summary.flaggedOrFakeScans}
          </div>
        </div>
      </div>

      {/* Tab Switch */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div role="tablist" aria-label="Audit views" className="flex items-center gap-6">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'scans'}
            onClick={() => setActiveTab('scans')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'scans'
                ? 'border-teal-700 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Verification History ({scanLogs.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'reports'
                ? 'border-teal-700 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Counterfeit Reports ({reports.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 animate-pulse">
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-10 bg-slate-100 rounded" />
        </div>
      ) : activeTab === 'scans' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {scanLogs.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No verification scans recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Code / Serial</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Origin Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {scanLogs.map((log) => {
                    const meta = OUTCOME_DISPLAY[log.outcome];
                    const OutcomeIcon = meta.Icon;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                          {log.resolvedSerial || log.submittedCode}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            {log.method === 'qr' ? (
                              <QrCode className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <Search className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>{log.method === 'qr' ? 'QR Scan' : 'Serial'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {log.productName ? (
                            <div>
                              <div className="font-medium text-slate-900">{log.productName}</div>
                              <div className="text-slate-500">{log.brand}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">Unregistered item</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${meta.colorClass}`}
                          >
                            <OutcomeIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{meta.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {log.location}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {reports.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No counterfeit reports submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-900">
                        {report.serialEntered}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Seller: {report.sellerName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{report.purchaseChannel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{report.cityRegion}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{report.notes}</p>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <div className="text-xs font-semibold text-red-700 capitalize">
                      {report.status.replace('_', ' ')}
                    </div>
                    <div className="font-mono text-xs text-slate-500 tabular-nums">
                      {formatTimestamp(report.submittedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
