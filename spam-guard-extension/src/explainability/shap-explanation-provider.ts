import { getApiBaseUrl } from '../shared/settings';
import type {
  ExplanationProvider,
  SpamExplanation,
  TokenAttribution,
} from './explanation-provider';

const EXPLAIN_PATH = '/spam-detection/explain';
// SHAP runs many forward passes per explanation, so this is far longer than
// the classify request's timeout -- it's only ever triggered on demand.
const REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_CAVEAT =
  'Estimated word contributions — decision support, not proof. ' +
  'The analyst makes the final call.';

interface BackendTokenContribution {
  readonly token: string;
  readonly shapValue: number;
}

interface BackendExplanationResponse {
  readonly verdict: 'SPAM' | 'HAM';
  readonly spamProbability: number;
  readonly baseValue: number;
  readonly truncatedTokenCount: number;
  readonly wasTruncated: boolean;
  readonly tokens: readonly BackendTokenContribution[];
  readonly topSpam: readonly BackendTokenContribution[];
  readonly topHam: readonly BackendTokenContribution[];
  readonly caveat?: string;
}

function isBackendTokenContribution(
  value: unknown,
): value is BackendTokenContribution {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.token === 'string' &&
    typeof candidate.shapValue === 'number'
  );
}

function isBackendExplanationResponse(
  value: unknown,
): value is BackendExplanationResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.verdict === 'SPAM' || candidate.verdict === 'HAM') &&
    typeof candidate.spamProbability === 'number' &&
    typeof candidate.baseValue === 'number' &&
    typeof candidate.truncatedTokenCount === 'number' &&
    typeof candidate.wasTruncated === 'boolean' &&
    Array.isArray(candidate.tokens) &&
    candidate.tokens.every(isBackendTokenContribution) &&
    Array.isArray(candidate.topSpam) &&
    candidate.topSpam.every(isBackendTokenContribution) &&
    Array.isArray(candidate.topHam) &&
    candidate.topHam.every(isBackendTokenContribution)
  );
}

/**
 * Calls the backend's SHAP explainer (POST /spam-detection/explain) and
 * adapts the response into the extension's ExplanationProvider shape.
 *
 * Only used from the popup's on-demand "Explain this" action -- never from
 * the live content-script badge, since SHAP is too slow for that path.
 */
export class ShapExplanationProvider implements ExplanationProvider {
  public async explain(emailBody: string): Promise<SpamExplanation> {
    if (emailBody.trim().length === 0) {
      return this.failure('No email body is available to explain.');
    }

    const apiBaseUrl = await getApiBaseUrl();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    let payload: unknown;
    try {
      const response = await fetch(
        `${apiBaseUrl}${EXPLAIN_PATH}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: emailBody }),
          signal: controller.signal,
        },
      );
      payload = await response.json().catch((): null => null);

      if (!response.ok) {
        const detail =
          payload !== null &&
          typeof payload === 'object' &&
          'message' in payload
            ? String((payload as { message: unknown }).message)
            : `Explanation request failed with status ${response.status}.`;
        return this.failure(detail);
      }
    } catch (error) {
      const reason =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Explanation request timed out.'
          : 'Unable to reach the explanation service.';
      return this.failure(reason);
    } finally {
      clearTimeout(timeout);
    }

    if (!isBackendExplanationResponse(payload)) {
      return this.failure(
        'Explanation service returned a malformed payload.',
      );
    }

    const maxAbsShapValue = payload.tokens.reduce(
      (max, token) => Math.max(
        max,
        Math.abs(token.shapValue),
      ),
      1e-6,
    );
    const toAttribution = (
      tokens: readonly BackendTokenContribution[],
    ): TokenAttribution[] =>
      tokens.map((token) => ({
        token: token.token,
        importance: token.shapValue / maxAbsShapValue,
      }));

    return {
      method: 'shap',
      attributions: toAttribution(payload.tokens),
      summary:
        `Verdict: ${payload.verdict} ` +
        `(spam probability ${(payload.spamProbability * 100).toFixed(1)}%)`,
      topSpam: toAttribution(payload.topSpam),
      topHam: toAttribution(payload.topHam),
      wasTruncated: payload.wasTruncated,
      caveat: payload.caveat ?? DEFAULT_CAVEAT,
    };
  }

  private failure(reason: string): SpamExplanation {
    return { method: 'shap', attributions: [], summary: reason };
  }
}
