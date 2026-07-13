'use client';

import { useState } from 'react';
import EmailIntakeForm from '@/components/EmailIntakeForm';
import AnalysisBreakdown from '@/components/AnalysisBreakdown';
import { classifyEmail, ApiError } from '@/lib/api';
import { ClassifyRequest, ClassificationResponse } from '@/lib/types';

export default function DashboardPage(): React.JSX.Element {
  const [result, setResult] = useState<ClassificationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (payload: ClassifyRequest): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await classifyEmail(payload);
      setResult(response);
    } catch (err: unknown) {
      setResult(null);
      setError(
        err instanceof ApiError ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Undergraduate Thesis Demonstrator
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Multilingual Email Spam Detection
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Fine-tuned XLM-RoBERTa · INT8 quantized ONNX · embedded inference
          engine — the verdict is produced purely from the model&apos;s text
          logits.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <EmailIntakeForm onSubmit={handleSubmit} loading={loading} />

        <section aria-live="polite">
          {error !== null && (
            <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
              <span className="font-semibold">Analysis failed: </span>
              {error}
            </div>
          )}
          {loading && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-edge bg-panel">
              <div className="flex items-center gap-3 text-slate-400">
                <span className="h-3 w-3 animate-ping rounded-full bg-cyan-400" />
                Running embedded ONNX inference…
              </div>
            </div>
          )}
          {!loading && error === null && result === null && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-edge bg-panel/50 text-sm text-slate-500">
              Submit an email body on the left to see the model&apos;s
              confidence.
            </div>
          )}
          {!loading && result !== null && <AnalysisBreakdown result={result} />}
        </section>
      </div>
    </main>
  );
}
