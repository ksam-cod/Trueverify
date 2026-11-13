import { CheckCircle2, QrCode, ShieldAlert } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      index: '01.',
      title: 'Cryptographic Serial Issuance',
      description:
        'Manufacturers register each production batch on TrueVerify, generating a unique serialized identifier bound to a deterministic cryptographic digest and facility provenance.',
    },
    {
      index: '02.',
      title: 'Dual-Factor QR & Serial Binding',
      description:
        'Each physical unit carries both a human-readable serial code and a tamper-evident QR seal. Scanning with a camera or uploading a seal photo extracts and validates the signature in under 120ms.',
    },
    {
      index: '03.',
      title: 'Real-Time Clone & Recall Detection',
      description:
        'When a counterfeit operation duplicates a valid QR sticker, TrueVerify flags abnormal scan velocity across dispersed regions and surfaces immediate buyer warnings.',
    },
  ];

  const checkpoints = [
    {
      icon: CheckCircle2,
      label: 'Genuine Verification',
      detail: 'Matches manufacturer ledger with normal ownership scan frequency and verified facility chain.',
    },
    {
      icon: ShieldAlert,
      label: 'Cloned or Recalled Alert',
      detail: 'Flags valid serial numbers duplicated onto multiple boxes or batches under safety recall.',
    },
    {
      icon: QrCode,
      label: 'Unregistered Counterfeit',
      detail: 'Immediately rejects fabricated serials or forged QR URLs absent from the cryptographic registry.',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="border-t border-[#CFE4E1] bg-white py-16 sm:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold text-teal-700 mb-2">
            Authentication Protocol
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#082422] text-balance">
            How TrueVerify distinguishes genuine hardware from counterfeits
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Every physical item is anchored to a verifiable ledger entry at the point of manufacture, enabling consumers and retailers to confirm origin before purchase.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-[#CFE4E1]">
          {steps.map((step) => (
            <div key={step.index} className="space-y-2.5">
              <div className="font-mono text-sm font-semibold text-teal-700 tabular-nums">
                {step.index}
              </div>
              <h3 className="font-display text-lg font-semibold text-[#082422]">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <h3 className="font-display text-xl font-semibold text-[#082422] mb-2">
              Three-tier outcome classification
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Authentication never relies on color alone. Every result pairs a clear verdict label, status icon, and actionable next step.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#CFE4E1]">
              <div>
                <div className="font-mono text-2xl font-semibold text-[#082422] tabular-nums">
                  &lt;120ms
                </div>
                <div className="text-xs text-slate-500 mt-1">Lookup latency</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold text-[#082422] tabular-nums">
                  24-char
                </div>
                <div className="text-xs text-slate-500 mt-1">Batch digest</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold text-[#082422] tabular-nums">
                  15 scans
                </div>
                <div className="text-xs text-slate-500 mt-1">Clone threshold</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {checkpoints.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="p-5 rounded-xl bg-[#F2FAF9] border border-[#CFE4E1] flex flex-col gap-2.5"
                >
                  <Icon className="w-5 h-5 text-teal-700" strokeWidth={1.75} />
                  <div className="font-display text-sm font-semibold text-[#082422]">
                    {item.label}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
