import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  validateCounterfeitReportInput,
  type CounterfeitReport,
  type NewReportInput,
} from '../utils/verification';

interface ReportCounterfeitModalProps {
  isOpen: boolean;
  initialSerial?: string;
  onClose: () => void;
  onSubmitted: (report: CounterfeitReport) => void;
}

export function ReportCounterfeitModal({
  isOpen,
  initialSerial = '',
  onClose,
  onSubmitted,
}: ReportCounterfeitModalProps) {
  const [form, setForm] = useState<NewReportInput>({
    serialEntered: initialSerial,
    sellerName: '',
    purchaseChannel: 'Online Marketplace',
    cityRegion: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm((prev) => ({ ...prev, serialEntered: initialSerial }));
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, initialSerial]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateCounterfeitReportInput(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as {
        report?: CounterfeitReport;
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      if (!res.ok || !data.report) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setServerError(data.error || 'Could not submit counterfeit report.');
        return;
      }
      onSubmitted(data.report);
      onClose();
    } catch {
      setServerError('Network error while submitting report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="report-modal-title" className="font-display text-lg font-semibold text-slate-900">
            Report Suspected Counterfeit
          </h2>
          <button
            type="button"
            aria-label="Close counterfeit report dialog"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {serverError && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {serverError}
            </div>
          )}

          <div>
            <label htmlFor="report-serial" className="block text-xs font-semibold text-slate-700 mb-1">
              Serial Number or QR Code
            </label>
            <input
              id="report-serial"
              type="text"
              value={form.serialEntered}
              onChange={(e) => {
                setForm({ ...form, serialEntered: e.target.value });
                setErrors({ ...errors, serialEntered: '' });
              }}
              placeholder="e.g. TV-9999-FAKE-01"
              className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
            {errors.serialEntered && (
              <p className="text-xs text-red-700 mt-1">{errors.serialEntered}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="report-seller" className="block text-xs font-semibold text-slate-700 mb-1">
                Seller or Storefront Name
              </label>
              <input
                id="report-seller"
                type="text"
                value={form.sellerName}
                onChange={(e) => {
                  setForm({ ...form, sellerName: e.target.value });
                  setErrors({ ...errors, sellerName: '' });
                }}
                placeholder="e.g. Discount Watch Hub"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
              {errors.sellerName && (
                <p className="text-xs text-red-700 mt-1">{errors.sellerName}</p>
              )}
            </div>

            <div>
              <label htmlFor="report-channel" className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Channel
              </label>
              <select
                id="report-channel"
                value={form.purchaseChannel}
                onChange={(e) => setForm({ ...form, purchaseChannel: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-700"
              >
                <option value="Online Marketplace">Online Marketplace</option>
                <option value="Physical Retail Store">Physical Retail Store</option>
                <option value="Social Commerce">Social Commerce</option>
                <option value="Peer-to-Peer Resale">Peer-to-Peer Resale</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="report-region" className="block text-xs font-semibold text-slate-700 mb-1">
              City / Region
            </label>
            <input
              id="report-region"
              type="text"
              value={form.cityRegion}
              onChange={(e) => {
                setForm({ ...form, cityRegion: e.target.value });
                setErrors({ ...errors, cityRegion: '' });
              }}
              placeholder="e.g. London, UK"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
            {errors.cityRegion && (
              <p className="text-xs text-red-700 mt-1">{errors.cityRegion}</p>
            )}
          </div>

          <div>
            <label htmlFor="report-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Discrepancy Details
            </label>
            <textarea
              id="report-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => {
                setForm({ ...form, notes: e.target.value });
                setErrors({ ...errors, notes: '' });
              }}
              placeholder="Describe packaging anomalies, seller listing URL, or seal defects..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
            {errors.notes && (
              <p className="text-xs text-red-700 mt-1">{errors.notes}</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
