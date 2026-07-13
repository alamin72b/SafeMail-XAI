'use client';

interface ConfidenceGaugeProps {
  spamProbability: number; // 0..1
  hamProbability: number; // 0..1
  verdict: 'SPAM' | 'HAM';
}

export default function ConfidenceGauge({
  spamProbability,
  hamProbability,
  verdict,
}: ConfidenceGaugeProps): React.JSX.Element {
  const spamPct = Math.round(spamProbability * 1000) / 10;
  const hamPct = Math.round(hamProbability * 1000) / 10;
  const isSpam = verdict === 'SPAM';

  return (
    <div className="rounded-xl border border-edge bg-panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Classification Confidence
        </h3>
        <span
          className={
            'rounded-full px-3 py-1 text-xs font-bold ' +
            (isSpam
              ? 'bg-red-500/20 text-red-400'
              : 'bg-emerald-500/20 text-emerald-400')
          }
        >
          {verdict}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-red-400">Spam</span>
            <span className="tabular-nums text-slate-300">{spamPct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-700"
              style={{ width: `${spamPct}%` }}
              role="progressbar"
              aria-valuenow={spamPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Spam probability"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-emerald-400">Ham</span>
            <span className="tabular-nums text-slate-300">{hamPct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
              style={{ width: `${hamPct}%` }}
              role="progressbar"
              aria-valuenow={hamPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Ham probability"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
