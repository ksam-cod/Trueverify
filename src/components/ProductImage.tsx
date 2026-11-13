import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getProductImageSrc } from '../utils/productImages';
import type { ProductImageKey } from '../utils/verification';

interface ProductImageProps {
  imageKey: ProductImageKey;
  alt: string;
  className?: string;
}

export function ProductImage({ imageKey, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-500 border border-slate-200 ${className}`}
        role="img"
        aria-label={alt}
      >
        <ShieldCheck className="w-8 h-8 mb-2 text-slate-400" strokeWidth={1.5} />
        <span className="text-xs font-medium text-slate-600 px-3 text-center">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={getProductImageSrc(imageKey)}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
