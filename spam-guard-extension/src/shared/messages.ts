import { isSpamPredictionResult, type SpamPredictionResult } from './types';

export interface PredictEmailRequest {
  readonly type: 'PREDICT_EMAIL';
  readonly subject: string;
  readonly body: string;
}

export type ExtensionRequest = PredictEmailRequest;

export interface PredictionSuccessResponse {
  readonly type: 'PREDICTION_OK';
  readonly result: SpamPredictionResult;
}

export interface PredictionErrorResponse {
  readonly type: 'PREDICTION_ERROR';
  readonly reason: string;
}

export type PredictionResponse =
  PredictionSuccessResponse | PredictionErrorResponse;

export function isPredictEmailRequest(
  value: unknown,
): value is PredictEmailRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === 'PREDICT_EMAIL' &&
    typeof candidate.subject === 'string' &&
    typeof candidate.body === 'string'
  );
}

export function isPredictionResponse(
  value: unknown,
): value is PredictionResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.type === 'PREDICTION_ERROR') {
    return typeof candidate.reason === 'string';
  }
  if (candidate.type === 'PREDICTION_OK') {
    return isSpamPredictionResult(candidate.result);
  }
  return false;
}
