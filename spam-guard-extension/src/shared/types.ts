export interface SpamPredictionResult {
  readonly isSpam: boolean;
  readonly label: 'spam' | 'ham';
  readonly spamProbability: number;
  readonly hamProbability: number;
  readonly threshold: number;
}

export interface NestErrorBody {
  readonly statusCode: number;
  readonly message: string | string[];
  readonly error?: string;
}

export interface ScanRecord {
  readonly subject: string;
  readonly label: 'spam' | 'ham';
  readonly spamProbability: number;
  readonly scannedAt: number;
}

export function isSpamPredictionResult(
  value: unknown,
): value is SpamPredictionResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.isSpam === 'boolean' &&
    (candidate.label === 'spam' || candidate.label === 'ham') &&
    typeof candidate.spamProbability === 'number' &&
    typeof candidate.hamProbability === 'number' &&
    typeof candidate.threshold === 'number'
  );
}

export function isNestErrorBody(value: unknown): value is NestErrorBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.statusCode === 'number' &&
    (typeof candidate.message === 'string' || Array.isArray(candidate.message))
  );
}
