'use client';

import { ClassificationResponse } from '@/lib/types';
import ConfidenceGauge from './ConfidenceGauge';

interface AnalysisBreakdownProps {
  result: ClassificationResponse;
}

export default function AnalysisBreakdown({
  result,
}: AnalysisBreakdownProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <ConfidenceGauge
        spamProbability={result.spamProbability}
        hamProbability={result.hamProbability}
        verdict={result.verdict}
      />

      <div className="rounded-xl border border-edge bg-panel p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Model Internals
        </h3>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">P(spam)</dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-red-400">
              {result.spamProbability.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">P(ham)</dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-emerald-400">
              {result.hamProbability.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Raw logits [ham, spam]</dt>
            <dd className="mt-1 font-mono text-xs tabular-nums text-slate-300">
              [{result.logits[0].toFixed(3)}, {result.logits[1].toFixed(3)}]
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tokens / Latency</dt>
            <dd className="mt-1 font-mono text-xs tabular-nums text-slate-300">
              {result.tokenCount} tok · {result.inferenceTimeMs} ms
            </dd>
          </div>
        </dl>
      </div>

      <p className="text-center text-[11px] text-slate-600">
        {result.model.name} · {result.model.quantization} ·{' '}
        {result.model.runtime} · {new Date(result.processedAt).toLocaleString()}
      </p>
    </div>
  );
}
