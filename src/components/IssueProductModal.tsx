import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  validateNewProductInput,
  type NewProductInput,
  type ProductImageKey,
  type ProductRecord,
} from '../utils/verification';

interface IssueProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssued: (product: ProductRecord) => void;
}

const INITIAL_FORM: NewProductInput = {
  brand: '',
  productName: '',
  modelSku: '',
  category: 'Luxury Timepieces',
  batchCode: '',
  originFacility: '',
  warrantyMonths: 24,
  imageKey: 'seal',
};

export function IssueProductModal({ isOpen, onClose, onIssued }: IssueProductModalProps) {
  const [form, setForm] = useState<NewProductInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_FORM);
      setErrors({});
      setServerError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateNewProductInput(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as {
        product?: ProductRecord;
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      if (!res.ok || !data.product) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setServerError(data.error || 'Failed to issue product serial.');
        return;
      }
      onIssued(data.product);
      onClose();
    } catch {
      setServerError('Network error while registering product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-modal-title"
    >
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="issue-modal-title" className="font-display text-lg font-semibold text-slate-900">
              Issue Product Serial &amp; QR Seal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Register a genuine unit on the TrueVerify ledger and generate its cryptographic QR seal.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close issue serial dialog"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="issue-brand" className="block text-xs font-semibold text-slate-700 mb-1">
                Brand / Manufacturer
              </label>
              <input
                id="issue-brand"
                type="text"
                value={form.brand}
                onChange={(e) => {
                  setForm({ ...form, brand: e.target.value });
                  setErrors({ ...errors, brand: '' });
                }}
                placeholder="e.g. Aethereal Horology"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
              {errors.brand && <p className="text-xs text-red-700 mt-1">{errors.brand}</p>}
            </div>

            <div>
              <label htmlFor="issue-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name
              </label>
              <input
                id="issue-name"
                type="text"
                value={form.productName}
                onChange={(e) => {
                  setForm({ ...form, productName: e.target.value });
                  setErrors({ ...errors, productName: '' });
                }}
                placeholder="e.g. Meridian Automatic 40mm"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
              {errors.productName && (
                <p className="text-xs text-red-700 mt-1">{errors.productName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="issue-sku" className="block text-xs font-semibold text-slate-700 mb-1">
                Model SKU
              </label>
              <input
                id="issue-sku"
                type="text"
                value={form.modelSku}
                onChange={(e) => {
                  setForm({ ...form, modelSku: e.target.value });
                  setErrors({ ...errors, modelSku: '' });
                }}
                placeholder="e.g. AE-MR40-TI"
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
              {errors.modelSku && <p className="text-xs text-red-700 mt-1">{errors.modelSku}</p>}
            </div>

            <div>
              <label htmlFor="issue-batch" className="block text-xs font-semibold text-slate-700 mb-1">
                Batch Code
              </label>
              <input
                id="issue-batch"
                type="text"
                value={form.batchCode}
                onChange={(e) => {
                  setForm({ ...form, batchCode: e.target.value });
                  setErrors({ ...errors, batchCode: '' });
                }}
                placeholder="e.g. BATCH-GVA-2611"
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
              {errors.batchCode && <p className="text-xs text-red-700 mt-1">{errors.batchCode}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="issue-category" className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                id="issue-category"
                value={form.category}
                onChange={(e) => {
                  const category = e.target.value;
                  const imageMap: Record<string, ProductImageKey> = {
                    'Luxury Timepieces': 'watch',
                    'Pro Audio Hardware': 'headphones',
                    'Clinical Skincare': 'serum',
                    'Security Hardware': 'seal',
                  };
                  setForm({
                    ...form,
                    category,
                    imageKey: imageMap[category] ?? 'seal',
                  });
                }}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-700"
              >
                <option value="Luxury Timepieces">Luxury Timepieces</option>
                <option value="Pro Audio Hardware">Pro Audio Hardware</option>
                <option value="Clinical Skincare">Clinical Skincare</option>
                <option value="Security Hardware">Security Hardware</option>
              </select>
            </div>

            <div>
              <label htmlFor="issue-warranty" className="block text-xs font-semibold text-slate-700 mb-1">
                Warranty (Months)
              </label>
              <input
                id="issue-warranty"
                type="number"
                min={0}
                max={240}
                value={form.warrantyMonths}
                onChange={(e) => {
                  setForm({ ...form, warrantyMonths: Number(e.target.value) });
                  setErrors({ ...errors, warrantyMonths: '' });
                }}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
              {errors.warrantyMonths && (
                <p className="text-xs text-red-700 mt-1">{errors.warrantyMonths}</p>
              )}
            </div>

            <div>
              <label htmlFor="issue-facility" className="block text-xs font-semibold text-slate-700 mb-1">
                Origin Facility
              </label>
              <input
                id="issue-facility"
                type="text"
                value={form.originFacility}
                onChange={(e) => {
                  setForm({ ...form, originFacility: e.target.value });
                  setErrors({ ...errors, originFacility: '' });
                }}
                placeholder="Geneva, CH"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
              {errors.originFacility && (
                <p className="text-xs text-red-700 mt-1">{errors.originFacility}</p>
              )}
            </div>
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
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg cursor-pointer"
            >
              {submitting ? 'Issuing Serial...' : 'Generate Serial & QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
