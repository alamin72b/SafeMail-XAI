import { appendScanRecord } from '../shared/history';
import {
  isPredictEmailRequest,
  type PredictionResponse,
} from '../shared/messages';
import { getApiBaseUrl } from '../shared/settings';
import type { SpamPredictionResult } from '../shared/types';
import { ApiError, predictSpam } from './api-client';
import { sha256Hex } from './hash';
import { LruCache } from './lru-cache';

const CACHE_CAPACITY = 100;

const predictionCache = new LruCache<string, SpamPredictionResult>(
  CACHE_CAPACITY,
);

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: PredictionResponse) => void,
  ): boolean => {
    if (!isPredictEmailRequest(message)) {
      return false;
    }
    void handlePrediction(
      message.subject,
      message.body,
    ).then(sendResponse);
    return true;
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

    return { type: 'PREDICTION_OK', result };
  } catch (error) {
    const reason =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Unknown error while contacting the spam detection API.';
    return { type: 'PREDICTION_ERROR', reason };
  }
}
