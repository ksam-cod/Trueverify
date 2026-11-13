import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  QrCode,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { ProductImage } from './ProductImage';
import { downloadDataUrl, generateQrDataUrl } from '../utils/qrClient';
import {
  buildQrVerificationPayload,
  type ProductRecord,
  type ProductStatus,
} from '../utils/verification';

interface RegistryViewProps {
  products: ProductRecord[];
  isLoading: boolean;
  selectedProductId: string | null;
  onSelectProduct: (id: string) => void;
  onOpenIssueModal: () => void;
  onVerifyQrPayload: (payload: string) => void;
}

const STATUS_META: Record<
  ProductStatus,
  { label: string; colorClass: string; Icon: typeof CheckCircle2 }
> = {
  authentic: {
    label: 'Authentic',
    colorClass: 'text-emerald-800',
    Icon: CheckCircle2,
  },
  flagged_cloned: {
    label: 'Flagged Clone',
    colorClass: 'text-red-700',
    Icon: ShieldAlert,
  },
  recalled: {
    label: 'Recalled Batch',
    colorClass: 'text-amber-700',
    Icon: AlertTriangle,
  },
};

export function RegistryView({
  products,
  isLoading,
  selectedProductId,
  onSelectProduct,
  onOpenIssueModal,
  onVerifyQrPayload,
}: RegistryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesQuery =
        !q ||
        p.serialNumber.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        p.batchCode.toLowerCase().includes(q) ||
        p.modelSku.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [products, searchQuery, statusFilter]);

  const selectedProduct = useMemo(() => {
    if (selectedProductId) {
      const found = products.find((p) => p.id === selectedProductId);
      if (found) return found;
    }
    return filteredProducts[0] ?? products[0] ?? null;
  }, [products, filteredProducts, selectedProductId]);

  useEffect(() => {
    if (!selectedProduct) {
      setQrDataUrl(null);
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const payload = buildQrVerificationPayload(selectedProduct.serialNumber, origin);
    generateQrDataUrl(payload, 240)
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [selectedProduct]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Registered Product Ledger
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Inspect active serial numbers, generate print-ready QR seals, or issue new units.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenIssueModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Serial</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Search registered products"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search serial, brand, SKU, or batch..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-teal-700"
          />
        </div>

        <div
          role="group"
          aria-label="Filter registry by status"
          className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto"
        >
          {(
            [
              { id: 'all', label: 'All Units' },
              { id: 'authentic', label: 'Authentic' },
              { id: 'flagged_cloned', label: 'Flagged' },
              { id: 'recalled', label: 'Recalled' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3 animate-pulse">
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-100 rounded" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="text-sm font-semibold text-slate-900">
                No matching products found
              </div>
              <p className="text-xs text-slate-500">
                Try clearing your search filter or issue a new product serial number.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Scans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredProducts.map((product) => {
                    const meta = STATUS_META[product.status];
                    const StatusIcon = meta.Icon;
                    const isSelected = selectedProduct?.id === product.id;

                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-teal-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(product.id)}
                            className="text-left hover:text-teal-700 underline-offset-2 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded"
                          >
                            {product.serialNumber}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{product.productName}</div>
                          <div className="text-xs text-slate-500">
                            {product.brand} · {product.modelSku}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {product.batchCode}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.colorClass}`}>
                            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{meta.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                          {product.scanCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Product QR Inspector */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          {selectedProduct ? (
            <>
              <div className="flex items-start gap-3.5">
                <div className="w-16 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                  <ProductImage
                    imageKey={selectedProduct.imageKey}
                    alt={selectedProduct.productName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 truncate">{selectedProduct.brand}</div>
                  <h2 className="font-display text-base font-semibold text-slate-900 truncate">
                    {selectedProduct.productName}
                  </h2>
                  <div className="font-mono text-xs text-slate-600 mt-0.5">
                    {selectedProduct.serialNumber}
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-200 flex flex-col items-center text-center gap-3">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR code for ${selectedProduct.serialNumber}`}
                    className="w-40 h-40 rounded-lg bg-white p-1.5 border border-slate-200"
                  />
                ) : (
                  <div className="w-40 h-40 rounded-lg bg-slate-100 animate-pulse" />
                )}
                <div className="text-xs text-slate-600">
                  Bound QR seal encodes verification URL and serial identifier.
                </div>
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    disabled={!qrDataUrl}
                    onClick={() =>
                      qrDataUrl &&
                      downloadDataUrl(qrDataUrl, `${selectedProduct.serialNumber}-qr.png`)
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const origin =
                        typeof window !== 'undefined' ? window.location.origin : undefined;
                      onVerifyQrPayload(
                        buildQrVerificationPayload(selectedProduct.serialNumber, origin)
                      );
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Verify QR</span>
                  </button>
                </div>
              </div>

              <dl className="space-y-2.5 text-xs pt-2 border-t border-slate-200">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Origin Facility</dt>
                  <dd className="text-slate-900 font-medium text-right">
                    {selectedProduct.originFacility}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Manufactured</dt>
                  <dd className="font-mono text-slate-900 tabular-nums">
                    {selectedProduct.manufacturedDate}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Warranty</dt>
                  <dd className="font-mono text-slate-900 tabular-nums">
                    {selectedProduct.warrantyMonths} months
                  </dd>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <dt className="text-slate-500 mb-1">Cryptographic Digest</dt>
                  <dd className="font-mono text-[11px] text-slate-700 break-all">
                    {selectedProduct.cryptographicDigest}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="text-sm text-slate-500 py-8 text-center">
              Select a product from the ledger to inspect its QR authenticity seal.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
