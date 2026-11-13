import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, Download, ImageUp, QrCode, Search, Square, Upload } from 'lucide-react';
import {
  decodeQrFromFile,
  decodeQrFromImageData,
  decodeQrFromImageUrl,
  downloadDataUrl,
  generateQrDataUrl,
} from '../utils/qrClient';
import { buildQrVerificationPayload, type VerificationMethod } from '../utils/verification';

interface VerificationWorkbenchProps {
  initialCode?: string;
  isVerifying: boolean;
  onVerify: (code: string, method: VerificationMethod) => Promise<void>;
}

interface SampleQrItem {
  label: string;
  serial: string;
  tag: string;
  dataUrl: string;
}

const SAMPLE_SERIALS = [
  { label: 'Genuine Watch', serial: 'TV-2026-8841-AE' },
  { label: 'Cloned Serial', serial: 'TV-2025-4410-CL' },
  { label: 'Recalled Batch', serial: 'TV-2025-1904-RC' },
  { label: 'Fake Serial', serial: 'TV-9999-FAKE-01' },
];

export function VerificationWorkbench({
  initialCode = '',
  isVerifying,
  onVerify,
}: VerificationWorkbenchProps) {
  const [mode, setMode] = useState<'serial' | 'qr'>('serial');
  const [serialInput, setSerialInput] = useState(initialCode);
  const [inputError, setInputError] = useState<string | null>(null);

  // QR file upload & camera state
  const [qrStatus, setQrStatus] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [decodedPreview, setDecodedPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [sampleQrs, setSampleQrs] = useState<SampleQrItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialCode) {
      setSerialInput(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    let active = true;
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const specs = [
      { label: 'Genuine Watch Tag', serial: 'TV-2026-8841-AE', tag: 'Authentic' },
      { label: 'Cloned Watch Tag', serial: 'TV-2025-4410-CL', tag: 'Flagged Clone' },
      { label: 'Counterfeit Sticker', serial: 'TV-9999-FAKE-01', tag: 'Unregistered' },
    ];
    Promise.all(
      specs.map(async (item) => ({
        ...item,
        dataUrl: await generateQrDataUrl(buildQrVerificationPayload(item.serial, origin), 180),
      }))
    )
      .then((items) => {
        if (active) setSampleQrs(items);
      })
      .catch(() => {
        // Ignore sample QR render errors
      });
    return () => {
      active = false;
    };
  }, []);

  const stopCamera = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleModeChange = (nextMode: 'serial' | 'qr') => {
    if (nextMode === 'serial') {
      stopCamera();
    }
    setInputError(null);
    setQrError(null);
    setMode(nextMode);
  };

  const handleSerialSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = serialInput.trim();
    if (!trimmed) {
      setInputError('Please enter a product serial number before verifying.');
      return;
    }
    setInputError(null);
    await onVerify(trimmed, 'serial');
  };

  const handleQuickSerial = async (serial: string) => {
    setMode('serial');
    setSerialInput(serial);
    setInputError(null);
    await onVerify(serial, 'serial');
  };

  const handleQrFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrError(null);
    setQrStatus(`Scanning ${file.name}...`);
    setDecodedPreview(null);

    try {
      const payload = await decodeQrFromFile(file);
      if (!payload) {
        setQrStatus(null);
        setQrError('No readable QR code was detected in that image. Try a clearer, higher-contrast photo.');
        return;
      }
      setDecodedPreview(payload);
      setQrStatus('QR code decoded successfully. Verifying against ledger...');
      await onVerify(payload, 'qr');
      setQrStatus('QR payload verified.');
    } catch {
      setQrStatus(null);
      setQrError('Unable to process the selected image file. Please upload a valid PNG, JPG, or WebP.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDecodeSampleQr = async (sample: SampleQrItem) => {
    setQrError(null);
    setQrStatus(`Decoding ${sample.label} QR image...`);
    try {
      const decoded = await decodeQrFromImageUrl(sample.dataUrl);
      if (!decoded) {
        setQrError('Failed to decode sample QR image.');
        setQrStatus(null);
        return;
      }
      setDecodedPreview(decoded);
      setQrStatus('Sample QR image decoded via jsQR. Authenticating...');
      await onVerify(decoded, 'qr');
      setQrStatus('QR payload authenticated.');
    } catch {
      setQrError('Could not decode sample QR code.');
      setQrStatus(null);
    }
  };

  const startCameraScan = async () => {
    setQrError(null);
    setQrStatus('Requesting camera access...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setQrStatus(null);
      setQrError(
        'Camera capture is not supported in this browser context. Upload a QR code photo or test a sample QR tag below.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setQrStatus('Camera active. Point the product QR seal inside the frame.');

      requestAnimationFrame(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        void videoRef.current.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scanFrame = () => {
          const video = videoRef.current;
          if (!video || !streamRef.current) return;

          if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const decoded = decodeQrFromImageData(imageData);
            if (decoded) {
              stopCamera();
              setDecodedPreview(decoded);
              setQrStatus('QR code captured from camera. Authenticating...');
              void onVerify(decoded, 'qr').then(() => {
                setQrStatus('QR payload verified.');
              });
              return;
            }
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        };

        rafRef.current = requestAnimationFrame(scanFrame);
      });
    } catch {
      stopCamera();
      setQrStatus(null);
      setQrError(
        'Camera permission was denied or no camera device is available. You can upload a QR code image or decode a sample QR tag below.'
      );
    }
  };

  return (
    <div
      id="workbench"
      className="bg-white border border-[#CFE4E1] rounded-2xl p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#CFE4E1]">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#082422]">
            Instant Authentication Workbench
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Authenticate via etched serial number or product QR security seal.
          </p>
        </div>

        {/* Segmented functional control */}
        <div
          role="tablist"
          aria-label="Verification method"
          className="inline-flex items-center p-1 bg-[#EBF5F3] rounded-lg border border-[#CFE4E1]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'serial'}
            onClick={() => handleModeChange('serial')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
              mode === 'serial'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Serial Number</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'qr'}
            onClick={() => handleModeChange('qr')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
              mode === 'qr'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code Scan</span>
          </button>
        </div>
      </div>

      {mode === 'serial' ? (
        <div className="pt-6 space-y-5">
          <form onSubmit={handleSerialSubmit} noValidate className="space-y-3">
            <label
              htmlFor="serial-number-input"
              className="block text-sm font-medium text-slate-800"
            >
              Product Serial Number
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="serial-number-input"
                type="text"
                value={serialInput}
                onChange={(e) => {
                  setSerialInput(e.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder="e.g. TV-2026-8841-AE"
                aria-invalid={Boolean(inputError)}
                aria-describedby={inputError ? 'serial-input-error' : 'serial-input-help'}
                className="flex-1 px-4 py-3 text-base font-mono tracking-wide uppercase bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 placeholder:normal-case focus:outline-none focus:bg-white focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-700"
              >
                <Search className="w-4 h-4" />
                <span>{isVerifying ? 'Verifying...' : 'Verify Product'}</span>
              </button>
            </div>
            {inputError ? (
              <p id="serial-input-error" role="alert" className="text-sm text-red-700 font-medium">
                {inputError}
              </p>
            ) : (
              <p id="serial-input-help" className="text-xs text-slate-500">
                Enter the code engraved on the chassis tag, warranty card, or outer packaging seal.
              </p>
            )}
          </form>

          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-500 mb-2.5">
              Sample serial numbers for immediate testing
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SERIALS.map((item) => (
                <button
                  key={item.serial}
                  type="button"
                  onClick={() => handleQuickSerial(item.serial)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono text-slate-900">{item.serial}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Upload QR Image */}
            <div className="p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ImageUp className="w-4 h-4 text-teal-700" />
                  <span>Upload QR Image</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Select a photo or screenshot of a product QR seal (PNG, JPG, or WebP) to decode and verify.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  id="qr-file-upload"
                  onChange={handleQrFileChange}
                  className="sr-only"
                />
                <label
                  htmlFor="qr-file-upload"
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-teal-700"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose QR Image</span>
                </label>
              </div>
            </div>

            {/* Live Camera Scanner */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Camera className="w-4 h-4 text-teal-700" />
                  <span>Live Camera Scanner</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Use your device camera to scan a physical QR security tag in real time.
                </p>
              </div>
              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCameraScan}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Scan</span>
                </button>
              )}
            </div>
          </div>

          {cameraActive && (
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video max-h-72 flex items-center justify-center">
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
              >
                <div className="w-44 h-44 border-2 border-white/80 rounded-xl shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]" />
              </div>
            </div>
          )}

          {qrStatus && (
            <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="font-medium text-slate-900">{qrStatus}</div>
              {decodedPreview && (
                <div className="font-mono text-slate-600 break-all">
                  Decoded payload: {decodedPreview}
                </div>
              )}
            </div>
          )}

          {qrError && (
            <div
              role="alert"
              className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
            >
              {qrError}
            </div>
          )}

          {sampleQrs.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-500 mb-3">
                Test with live-generated scannable QR seals (click Decode or download PNG to upload)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {sampleQrs.map((sample) => (
                  <div
                    key={sample.serial}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col items-center text-center gap-2.5"
                  >
                    <img
                      src={sample.dataUrl}
                      alt={`QR seal for ${sample.label}`}
                      className="w-24 h-24 rounded-md border border-slate-100"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-900">
                        {sample.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {sample.tag} · <span className="font-mono">{sample.serial}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={() => handleDecodeSampleQr(sample)}
                        className="flex-1 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Decode QR
                      </button>
                      <button
                        type="button"
                        aria-label={`Download QR PNG for ${sample.serial}`}
                        onClick={() => downloadDataUrl(sample.dataUrl, `${sample.serial}-qr.png`)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
