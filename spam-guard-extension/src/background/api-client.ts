import {
  isNestErrorBody,
  isBackendClassificationResponse,
  type SpamPredictionResult,
} from '../shared/types';

const REQUEST_TIMEOUT_MS = 8000;
const CLASSIFY_PATH = '/spam-detection/classify';

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly isHttpError: boolean,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function predictSpam(
  apiBaseUrl: string,
  body: string,
): Promise<SpamPredictionResult> {
  try {
    return await requestOnce(apiBaseUrl, body);
  } catch (error) {
    if (error instanceof ApiError && error.isHttpError) {
      throw error;
    }
    return requestOnce(apiBaseUrl, body);
  }
}

async function requestOnce(
  apiBaseUrl: string,
  body: string,
): Promise<SpamPredictionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl}${CLASSIFY_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
      signal: controller.signal,
    });

    const payload: unknown = await response.json().catch((): null => null);

    if (!response.ok) {
      throw new ApiError(formatHttpError(response.status, payload), true);
    }
    if (!isBackendClassificationResponse(payload)) {
      throw new ApiError('API returned a malformed prediction payload.', true);
    }
    return {
      isSpam: payload.verdict === 'SPAM',
      label: payload.verdict === 'SPAM' ? 'spam' : 'ham',
      spamProbability: payload.spamProbability,
      hamProbability: payload.hamProbability,
      threshold: 0.5,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Spam detection request timed out.', false);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function formatHttpError(status: number, payload: unknown): string {
  if (isNestErrorBody(payload)) {
    const message = Array.isArray(payload.message)
      ? payload.message.join('; ')
      : payload.message;
    return `API error ${status}: ${message}`;
  }
  return `API error ${status}.`;
}
