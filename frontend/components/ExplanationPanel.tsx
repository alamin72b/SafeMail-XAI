'use client';

import { useState } from 'react';
import { ApiError, explainEmail } from '@/lib/api';
import { ExplanationResponse } from '@/lib/types';

interface ExplanationPanelProps {
  emailBody: string;
}

export default function ExplanationPanel({
  emailBody,
}: ExplanationPanelProps): React.JSX.Element {
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await explainEmail({ body: emailBody });
      setExplanation(response);
    } catch (err: unknown) {
      setExplanation(null);
      setError(
        err instanceof ApiError ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      setLoading(false);
    }
  };

  const maxAbsShapValue =
    explanation !== null
      ? Math.max(
          ...explanation.tokens.map((token) => Math.abs(token.shapValue)),
          1e-6,
        )
      : 1;

  return (
    <div className="rounded-xl border border-edge bg-panel p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Why this verdict? (SHAP)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Triage aid for the analyst — highlights which words pushed the
            model toward SPAM (red) or HAM (green).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExplain()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? 'Explaining…'
            : explanation !== null
              ? 'Re-explain'
              : 'Explain this'}
        </button>
      </div>

      {error !== null && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex h-24 items-center justify-center text-center text-xs text-slate-500">
          Computing SHAP attributions — this runs many forward passes and can
          take a while…
        </div>
      )}

      {!loading && explanation !== null && (
        <div className="space-y-4">
          {explanation.wasTruncated && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
              Only the first 128 tokens were analyzed; text past this point
              was not seen by the model.
            </div>
          )}

          <div className="whitespace-pre-wrap break-words rounded-lg border border-edge bg-surface p-4 text-sm leading-relaxed text-slate-200">
            {explanation.tokens.map((token, index) => {
              const intensity = Math.abs(token.shapValue) / maxAbsShapValue;
              const background =
                token.shapValue > 0
                  ? `rgba(248, 113, 113, ${(intensity * 0.55).toFixed(3)})`
                  : token.shapValue < 0
                    ? `rgba(52, 211, 153, ${(intensity * 0.55).toFixed(3)})`
                    : 'transparent';
              return (
                <span
                  key={index}
                  style={{ backgroundColor: background }}
                  className="rounded"
                  title={`shapValue: ${token.shapValue.toFixed(4)}`}
                >
                  {token.token}
                </span>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                Top spam signals
              </h4>
              <ul className="space-y-1">
                {explanation.topSpam.length === 0 && (
                  <li className="text-xs text-slate-600">
                    No strong spam signals.
                  </li>
                )}
                {explanation.topSpam.map((token, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between rounded bg-red-500/10 px-2 py-1 text-xs text-red-300"
                  >
                    <span className="font-mono">{token.token.trim()}</span>
                    <span className="tabular-nums text-red-400/80">
                      +{token.shapValue.toFixed(4)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Top ham signals
              </h4>
              <ul className="space-y-1">
                {explanation.topHam.length === 0 && (
                  <li className="text-xs text-slate-600">
                    No strong ham signals.
                  </li>
                )}
                {explanation.topHam.map((token, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
                  >
                    <span className="font-mono">{token.token.trim()}</span>
                    <span className="tabular-nums text-emerald-400/80">
                      {token.shapValue.toFixed(4)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="border-t border-edge pt-3 text-[11px] italic text-slate-500">
            {explanation.caveat}
          </p>
        </div>
      )}

      {!loading && explanation === null && error === null && (
        <p className="text-xs text-slate-600">
          Run an on-demand SHAP explanation to see which words drove this
          verdict. This is decision support for the analyst, not a
          replacement for their judgment.
        </p>
      )}
    </div>
  );
}
