import {
  type BackendExplanationResponse,
  isBackendExplanationResponse,
  isNestErrorBody,
} from '../shared/types';

// SHAP runs many forward passes per explanation, so this is far longer than
// the classify request's timeout -- it's only ever triggered on demand.
const REQUEST_TIMEOUT_MS = 60_000;
const EXPLAIN_PATH = '/spam-detection/explain';

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly isHttpError: boolean,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function explainSpam(
  apiBaseUrl: string,
  body: string,
): Promise<BackendExplanationResponse> {
  try {
    return await requestOnce(
      apiBaseUrl,
      body,
    );
  } catch (error) {
    if (error instanceof ApiError && error.isHttpError) {
      throw error;
    }
    return requestOnce(
      apiBaseUrl,
      body,
    );
  }
}

async function requestOnce(
  apiBaseUrl: string,
  body: string,
): Promise<BackendExplanationResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `${apiBaseUrl}${EXPLAIN_PATH}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
        signal: controller.signal,
      },
    );

    const payload: unknown = await response.json().catch((): null => null);

    if (!response.ok) {
      throw new ApiError(
        formatHttpError(
          response.status,
          payload,
        ),
        true,
      );
    }
    if (!isBackendExplanationResponse(payload)) {
      throw new ApiError(
        'Explanation service returned a malformed payload.',
        true,
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        'Explanation request timed out.',
        false,
      );
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
