import { appendScanRecord } from '../shared/history';
import { setLastScannedEmailBody } from '../shared/last-scanned-email';
import {
  type ExplanationMessageResponse,
  isExplainEmailRequest,
  isPredictEmailRequest,
  type PredictionResponse,
} from '../shared/messages';
import { getApiBaseUrl } from '../shared/settings';
import type {
  BackendExplanationResponse,
  SpamPredictionResult,
} from '../shared/types';
import { ApiError, predictSpam } from './api-client';
import { ApiError as ExplainApiError, explainSpam } from './explain-client';
import { sha256Hex } from './hash';
import { LruCache } from './lru-cache';

const CACHE_CAPACITY = 100;
const EXPLANATION_CACHE_CAPACITY = 50;

const predictionCache = new LruCache<string, SpamPredictionResult>(
  CACHE_CAPACITY,
);
const explanationCache = new LruCache<string, BackendExplanationResponse>(
  EXPLANATION_CACHE_CAPACITY,
);

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (
      response: PredictionResponse | ExplanationMessageResponse,
    ) => void,
  ): boolean => {
    if (isPredictEmailRequest(message)) {
      void handlePrediction(
        message.subject,
        message.body,
      ).then(sendResponse);
      return true;
    }
    if (isExplainEmailRequest(message)) {
      void handleExplanation(message.body).then(sendResponse);
      return true;
    }
    return false;
  },
);

async function handlePrediction(
  subject: string,
  body: string,
): Promise<PredictionResponse> {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { type: 'PREDICTION_ERROR', reason: 'Email body is empty.' };
  }

  try {
    const cacheKey = await sha256Hex(trimmed);
    const cached = predictionCache.get(cacheKey);
    if (cached !== undefined) {
      return { type: 'PREDICTION_OK', result: cached };
    }

    const apiBaseUrl = await getApiBaseUrl();
    const result = await predictSpam(
      apiBaseUrl,
      trimmed,
    );
    predictionCache.set(
      cacheKey,
      result,
    );

    await appendScanRecord({
      subject,
      label: result.label,
      spamProbability: result.spamProbability,
      scannedAt: Date.now(),
    });
    await setLastScannedEmailBody(trimmed);

    return { type: 'PREDICTION_OK', result };
  } catch (error) {
    const reason =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Unknown error while contacting the spam detection API.';
    return { type: 'PREDICTION_ERROR', reason };
  }
}

async function handleExplanation(
  body: string,
): Promise<ExplanationMessageResponse> {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return {
      type: 'EXPLANATION_ERROR',
      reason: 'No email body is available to explain.',
    };
  }

  try {
    const cacheKey = await sha256Hex(trimmed);
    const cached = explanationCache.get(cacheKey);
    if (cached !== undefined) {
      return { type: 'EXPLANATION_OK', result: cached };
    }

    const apiBaseUrl = await getApiBaseUrl();
    const result = await explainSpam(
      apiBaseUrl,
      trimmed,
    );
    explanationCache.set(
      cacheKey,
      result,
    );

    return { type: 'EXPLANATION_OK', result };
  } catch (error) {
    const reason =
      error instanceof ExplainApiError || error instanceof Error
        ? error.message
        : 'Unknown error while contacting the explanation API.';
    return { type: 'EXPLANATION_ERROR', reason };
  }
}
