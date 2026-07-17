export interface SpamPredictionResult {
  readonly isSpam: boolean;
  readonly label: 'spam' | 'ham';
  readonly spamProbability: number;
  readonly hamProbability: number;
  readonly threshold: number;
}

export interface BackendClassificationResponse {
  readonly verdict: 'SPAM' | 'HAM';
  readonly spamProbability: number;
  readonly hamProbability: number;
  readonly logits: readonly [number, number];
  readonly tokenCount: number;
  readonly inferenceTimeMs: number;
  readonly model: {
    readonly name: string;
    readonly quantization: string;
    readonly runtime: string;
  };
  readonly processedAt: string;
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

export function isBackendClassificationResponse(
  value: unknown,
): value is BackendClassificationResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.verdict === 'SPAM' || candidate.verdict === 'HAM') &&
    typeof candidate.spamProbability === 'number' &&
    typeof candidate.hamProbability === 'number' &&
    Array.isArray(candidate.logits) &&
    candidate.logits.length === 2 &&
    typeof candidate.logits[0] === 'number' &&
    typeof candidate.logits[1] === 'number' &&
    typeof candidate.tokenCount === 'number' &&
    typeof candidate.inferenceTimeMs === 'number' &&
    typeof candidate.model === 'object' &&
    candidate.model !== null &&
    typeof (candidate.model as Record<string, unknown>).name === 'string' &&
    typeof (candidate.model as Record<string, unknown>).quantization ===
      'string' &&
    typeof (candidate.model as Record<string, unknown>).runtime === 'string' &&
    typeof candidate.processedAt === 'string'
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
