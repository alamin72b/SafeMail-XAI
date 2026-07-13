'use client';

import { FormEvent, useState } from 'react';
import { ClassifyRequest } from '@/lib/types';

interface EmailIntakeFormProps {
  onSubmit: (payload: ClassifyRequest) => void;
  loading: boolean;
}

const MAX_BODY_LENGTH = 100_000;

export default function EmailIntakeForm({
  onSubmit,
  loading,
}: EmailIntakeFormProps): React.JSX.Element {
  const [body, setBody] = useState<string>('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const validate = (): boolean => {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      setFieldError('Email body is required.');
      return false;
    }
    if (trimmed.length > MAX_BODY_LENGTH) {
      setFieldError(
        `Email body exceeds the ${MAX_BODY_LENGTH.toLocaleString()} character limit.`,
      );
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!validate()) return;
    onSubmit({ body: body.trim() });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-edge bg-panel p-6 shadow-xl"
    >
      <h2 className="mb-1 text-lg font-semibold text-white">Email Intake</h2>
      <p className="mb-5 text-xs text-slate-500">
        Paste the raw email text in any language — XLM-R handles 100 languages
        natively.
      </p>

      <div>
        <label
          htmlFor="body"
          className="mb-1 block text-xs font-medium text-slate-400"
        >
          Email Body{' '}
          <span className="text-slate-500">(multilingual supported)</span>
        </label>
        <textarea
          id="body"
          rows={12}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            'অভিনন্দন! আপনি ১০০০ ডলার জিতেছেন — এখনই ক্লিক করুন!\n' +
            'Congratulations! You won $1000 — click now to claim your prize!'
          }
          dir="auto"
          className="w-full resize-y rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
        />
        <div className="mt-1 flex items-center justify-between">
          {fieldError !== null ? (
            <p className="text-xs text-red-400">{fieldError}</p>
          ) : (
            <span />
          )}
          <p className="text-[11px] tabular-nums text-slate-500">
            {body.length.toLocaleString()} / {MAX_BODY_LENGTH.toLocaleString()}
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Analyzing…' : 'Run Classification'}
      </button>
    </form>
  );
}
