import {
  type BackendExplanationResponse,
  isBackendExplanationResponse,
  isSpamPredictionResult,
  type SpamPredictionResult,
} from './types';

export interface PredictEmailRequest {
  readonly type: 'PREDICT_EMAIL';
  readonly subject: string;
  readonly body: string;
}

export interface ExplainEmailRequest {
  readonly type: 'EXPLAIN_EMAIL';
  readonly body: string;
}

export type ExtensionRequest = PredictEmailRequest | ExplainEmailRequest;

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

export function isExplainEmailRequest(
  value: unknown,
): value is ExplainEmailRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === 'EXPLAIN_EMAIL' &&
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

export interface ExplanationSuccessResponse {
  readonly type: 'EXPLANATION_OK';
  readonly result: BackendExplanationResponse;
}

export interface ExplanationErrorResponse {
  readonly type: 'EXPLANATION_ERROR';
  readonly reason: string;
}

export type ExplanationMessageResponse =
  ExplanationSuccessResponse | ExplanationErrorResponse;

export function isExplanationMessageResponse(
  value: unknown,
): value is ExplanationMessageResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.type === 'EXPLANATION_ERROR') {
    return typeof candidate.reason === 'string';
  }
  if (candidate.type === 'EXPLANATION_OK') {
    return isBackendExplanationResponse(candidate.result);
  }
  return false;
}
