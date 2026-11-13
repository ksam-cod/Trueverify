import QRCode from 'qrcode';
import jsQR from 'jsqr';

export async function generateQrDataUrl(payload: string, size = 240): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: size,
    margin: 2,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}

export function decodeQrFromImageData(imageData: ImageData): string | null {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data ?? null;
}

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await decodeQrFromImageUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function decodeQrFromImageUrl(src: string): Promise<string | null> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not load QR image.'));
    img.src = src;
  });

  const canvas = document.createElement('canvas');
  const maxDim = 960;
  const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return decodeQrFromImageData(imageData);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
